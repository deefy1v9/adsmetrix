"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getGoogleAdsStatusAction, type GoogleAdsStatus } from "@/actions/google-ads-actions";
import { GoogleAdsIcon } from "@/components/ui/PlatformIcons";
import { Button } from "@/components/ui/Button";
import { IntegrationCard, type IntegrationStatus } from "./IntegrationCard";

export function GoogleAdsPanel() {
    const [status, setStatus] = useState<GoogleAdsStatus | null>(null);
    useEffect(() => { getGoogleAdsStatusAction().then(setStatus); }, []);

    const configured = status && status.config.clientId && status.config.clientSecret && status.config.developerToken;
    let state: IntegrationStatus = "loading";
    if (status) state = !status.connected ? "disconnected" : status.lastError ? "attention" : "connected";

    let description: React.ReactNode = "Importe contas (inclusive via MCC), acompanhe investimento e conversões e pause campanhas.";
    if (status?.connected) {
        description = <>
            Conectado como <span className="font-medium text-foreground">{status.email ?? "conta Google"}</span> · {status.accounts.length} conta(s)
            {status.lastSyncedAt && <> · sincronizado {formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true, locale: ptBR })}</>}
        </>;
    } else if (status && !configured) {
        description = "O servidor ainda não tem as credenciais do Google Ads (GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET e GOOGLE_ADS_DEVELOPER_TOKEN).";
    }

    return (
        <IntegrationCard
            id="google-ads"
            icon={GoogleAdsIcon}
            title="Google Ads"
            description={description}
            status={state}
            statusLabel={status && !configured && !status.connected ? "Não configurado" : undefined}
            actions={status && (
                status.connected ? (
                    <Link href="/google-ads"><Button variant="outline">Abrir painel <ArrowRight className="h-4 w-4" /></Button></Link>
                ) : configured ? (
                    <a href="/api/auth/google-ads"><Button>Conectar</Button></a>
                ) : (
                    <Link href="/google-ads"><Button variant="outline">Ver instruções</Button></Link>
                )
            )}
        >
            {status?.lastError && <p className="text-sm text-warning">{status.lastError}</p>}
        </IntegrationCard>
    );
}
