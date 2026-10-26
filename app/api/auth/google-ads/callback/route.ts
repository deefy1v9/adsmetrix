import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { encryptSecret, safeEqual } from "@/lib/crypto";
import { exchangeGoogleCode, syncGoogleAdsAccounts } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gads_oauth_state";

export async function GET(request: NextRequest) {
    const base = getBaseUrl(request);
    const fail = (message: string) => {
        const res = NextResponse.redirect(`${base}/google-ads?error=${encodeURIComponent(message)}`);
        res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth/google-ads" });
        return res;
    };

    const { searchParams } = request.nextUrl;
    const error = searchParams.get("error");
    if (error) return fail(error === "access_denied" ? "Autorização cancelada no Google." : `Google retornou: ${error}`);

    const code = searchParams.get("code");
    const state = searchParams.get("state") ?? "";
    const expectedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
    if (!code) return fail("Código de autorização ausente.");
    if (!expectedState || !safeEqual(state, expectedState)) return fail("Sessão de autorização inválida ou expirada. Tente conectar novamente.");

    const session = await getSession();
    if (!session) return NextResponse.redirect(`${base}/login`);
    if (!session.workspace_id) return fail("Seu usuário não está vinculado a um workspace.");
    const workspaceId = session.workspace_id;

    try {
        const tokens = await exchangeGoogleCode(code, `${base}/api/auth/google-ads/callback`);
        if (!tokens.refresh_token) {
            return fail("O Google não devolveu um refresh token. Remova o acesso do app em myaccount.google.com/permissions e conecte novamente.");
        }

        const data = {
            google_email: tokens.email,
            refresh_token: encryptSecret(tokens.refresh_token),
            access_token: encryptSecret(tokens.access_token),
            access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
            connected_by_user_id: session.id,
            last_error: null,
        };
        await prisma.googleAdsConnection.upsert({
            where: { workspace_id: workspaceId },
            update: data,
            create: { workspace_id: workspaceId, ...data },
        });
    } catch (err: any) {
        console.error("[GoogleAdsAuth] token exchange failed:", err.message);
        return fail(err.message || "Falha ao conectar com o Google.");
    }

    // The connection is saved even if listing accounts fails (e.g. developer token still in test mode)
    let syncError: string | null = null;
    try {
        await syncGoogleAdsAccounts(workspaceId);
    } catch (err: any) {
        syncError = err.message;
        await prisma.googleAdsConnection.update({ where: { workspace_id: workspaceId }, data: { last_error: syncError } }).catch(() => {});
    }

    const res = NextResponse.redirect(`${base}/google-ads?${syncError ? `warning=${encodeURIComponent(syncError)}` : "connected=1"}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth/google-ads" });
    return res;
}
