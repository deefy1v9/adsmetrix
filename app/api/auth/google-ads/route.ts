import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { randomToken } from "@/lib/crypto";
import { buildGoogleAuthUrl, isGoogleAdsConfigured } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gads_oauth_state";

export async function GET(request: Request) {
    const base = getBaseUrl(request);
    const session = await getSession();
    if (!session) return NextResponse.redirect(`${base}/login`);
    if (!session.workspace_id) {
        return NextResponse.redirect(`${base}/google-ads?error=${encodeURIComponent("Seu usuário não está vinculado a um workspace.")}`);
    }
    if (!isGoogleAdsConfigured()) {
        return NextResponse.redirect(`${base}/google-ads?error=${encodeURIComponent("Credenciais do Google Ads não configuradas no servidor.")}`);
    }

    // CSRF protection: the callback only accepts the state we set in this browser
    const state = randomToken("", 24);
    const res = NextResponse.redirect(buildGoogleAuthUrl(`${base}/api/auth/google-ads/callback`, state));
    res.cookies.set(STATE_COOKIE, state, {
        httpOnly: true,
        secure: base.startsWith("https://"),
        sameSite: "lax",
        maxAge: 600,
        path: "/api/auth/google-ads",
    });
    return res;
}
