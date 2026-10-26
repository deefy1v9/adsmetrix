import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { requestFromHeaders } from "@/lib/base-url";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/ui/Logo";
import { pickAuthorizeParams, validateAuthorizeRequest } from "@/lib/mcp/authorize";
import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = { title: "Autorizar acesso", robots: { index: false } };
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10">
            <div className="absolute inset-0 bg-dots opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <div className="relative w-full max-w-md">{children}</div>
        </div>
    );
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const raw = await searchParams;
    const params = pickAuthorizeParams(raw);
    const request = await requestFromHeaders();
    const validation = await validateAuthorizeRequest(params, request);

    if (!validation.ok && "redirectTo" in validation) redirect(validation.redirectTo);
    if (!validation.ok) {
        return (
            <Shell>
                <div className="glass-card rounded-2xl p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h1 className="text-lg font-semibold">Não foi possível autorizar</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{validation.fatal}</p>
                </div>
            </Shell>
        );
    }

    const session = await getSession();
    if (!session) {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`);
    }

    if (!session.workspace_id) {
        return (
            <Shell>
                <div className="glass-card rounded-2xl p-8 text-center">
                    <h1 className="text-lg font-semibold">Usuário sem workspace</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sua conta não está vinculada a um workspace do {APP_NAME}. Peça um convite ao administrador.
                    </p>
                </div>
            </Shell>
        );
    }

    const redirectHost = new URL(validation.redirectUri).host;
    const isLoopback = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(redirectHost);

    return (
        <Shell>
            <div className="mb-6 flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <BrandMark className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1 text-muted-foreground/50">
                    <span className="h-1 w-1 rounded-full bg-current" />
                    <span className="h-1 w-1 rounded-full bg-current" />
                    <span className="h-1 w-1 rounded-full bg-current" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold shadow-sm">
                    {(validation.client.client_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
            </div>
            <ConsentForm
                params={validation.params}
                clientName={validation.client.client_name || "Um aplicativo"}
                redirectHost={redirectHost}
                isLoopback={isLoopback}
                scopes={validation.scopes}
                userEmail={session.email}
                workspaceName={session.workspace_name ?? "seu workspace"}
            />
        </Shell>
    );
}
