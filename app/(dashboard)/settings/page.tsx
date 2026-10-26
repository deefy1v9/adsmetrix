"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { MetaIcon } from "@/components/ui/PlatformIcons";
import { UazAPIPanel } from "@/components/features/whatsapp/UazAPIPanel";
import { MetaTokenPanel } from "@/components/features/settings/MetaTokenPanel";
import { IntegrationCard } from "@/components/features/settings/IntegrationCard";
import { GoogleAdsPanel } from "@/components/features/settings/GoogleAdsPanel";
import { McpPanel } from "@/components/features/settings/McpPanel";
import { AppearancePanel, PasswordPanel, ProfilePanel } from "@/components/features/settings/AccountPanels";

/** Result of the Meta OAuth callback, which redirects back here with ?success / ?error */
function CallbackBanner() {
    const params = useSearchParams();
    const success = params.get("success");
    const error = params.get("error");
    if (!success && !error) return null;
    return error ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Não foi possível conectar: {error}
        </div>
    ) : (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success === "meta_connected" ? "Meta Ads conectado com sucesso." : "Integração concluída."}
        </div>
    );
}

function MetaWebhookDiagnostics() {
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

    const retry = async () => {
        setBusy(true);
        setResult(null);
        try {
            const { retrySubscribeAction } = await import("@/actions/meta-actions");
            const res = await retrySubscribeAction();
            setResult({ ok: !!res.success, message: res.message || (res.success ? "Inscrição refeita." : `Erro: ${res.error}`) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-foreground">Webhook de leads</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Se os leads não estiverem chegando em tempo real, refaça a inscrição das páginas.
                        Webhooks não funcionam em <code>localhost</code> sem um túnel (ngrok/cloudflared).
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={retry} isLoading={busy} className="shrink-0">
                    {!busy && <RefreshCw className="h-3.5 w-3.5" />} Refazer inscrição
                </Button>
            </div>
            {result && <p className={`mt-2 text-xs ${result.ok ? "text-success" : "text-destructive"}`}>{result.message}</p>}
        </div>
    );
}

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistema"
                title="Integrações"
                icon={Plug}
                description="Conecte as plataformas de anúncio, o Claude e o WhatsApp, e gerencie sua conta."
            />

            <Suspense>
                <CallbackBanner />
            </Suspense>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <IntegrationCard
                        id="meta"
                        icon={MetaIcon}
                        title="Meta Ads"
                        description="Facebook e Instagram Ads: contas, campanhas, criativos e leads de formulário."
                        actions={
                            <Button onClick={() => { window.location.href = "/api/auth/meta"; }}>
                                Conectar com Facebook
                            </Button>
                        }
                    >
                        <div className="space-y-4">
                            <MetaTokenPanel />
                            <MetaWebhookDiagnostics />
                        </div>
                    </IntegrationCard>

                    <GoogleAdsPanel />

                    <McpPanel />

                    <div id="whatsapp" className="scroll-mt-24 space-y-4">
                        <SectionTitle title="WhatsApp" description="Gateway UazAPI para relatórios automáticos e alertas." />
                        <UazAPIPanel />
                    </div>
                </div>

                <aside className="space-y-6">
                    <ProfilePanel />
                    <PasswordPanel />
                    <AppearancePanel />
                </aside>
            </div>
        </div>
    );
}
