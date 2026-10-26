"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listMcpConnectionsAction, revokeMcpConnectionAction, type McpConnectionView } from "@/actions/oauth-actions";
import { ClaudeIcon } from "@/components/ui/PlatformIcons";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MCP_SCOPES } from "@/lib/mcp/scopes";
import { IntegrationCard } from "./IntegrationCard";

const STEPS = [
    <>No Claude, abra <strong>Configurações → Conectores</strong> e clique em <strong>Adicionar conector personalizado</strong>.</>,
    <>Dê um nome (ex: “Metrix Ads”) e cole a URL do servidor MCP abaixo.</>,
    <>Clique em <strong>Conectar</strong>, entre com seu usuário daqui e autorize o acesso.</>,
    <>Pronto: pergunte ao Claude, por exemplo, “quanto investi no Meta e no Google nos últimos 7 dias?”.</>,
];

function CopyField({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked: the value is selectable anyway */ }
    };
    return (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-surface p-1 pl-3">
            <code className="min-w-0 flex-1 truncate text-sm text-foreground select-all">{value}</code>
            <Button variant="outline" size="sm" onClick={copy} aria-label="Copiar URL">
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
            </Button>
        </div>
    );
}

export function McpPanel() {
    const [data, setData] = useState<{ connections: McpConnectionView[]; mcpUrl: string } | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => listMcpConnectionsAction().then(setData), []);
    useEffect(() => { listMcpConnectionsAction().then(setData); }, []);

    const revoke = async (c: McpConnectionView) => {
        if (!confirm(`Revogar o acesso de "${c.client_name}" (${c.user_email})? O Claude deixará de acessar os dados imediatamente.`)) return;
        setRevoking(c.id);
        setError(null);
        const res = await revokeMcpConnectionAction(c.id);
        setRevoking(null);
        if (res.success) await load();
        else setError(res.error ?? "Falha ao revogar");
    };

    const count = data?.connections.length ?? 0;

    return (
        <IntegrationCard
            id="claude"
            icon={ClaudeIcon}
            title="Claude (MCP)"
            description="Conecte o Claude via MCP com login OAuth: ele passa a consultar contas, métricas, campanhas e leads deste workspace — e, se você permitir, pausar ou ativar campanhas."
            status={!data ? "loading" : count > 0 ? "connected" : "disconnected"}
            statusLabel={count > 0 ? `${count} conexão${count > 1 ? "ões" : ""} ativa${count > 1 ? "s" : ""}` : undefined}
        >
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">URL do servidor MCP</p>
                        {data ? <CopyField value={data.mcpUrl} /> : <Skeleton className="h-10 w-full rounded-lg" />}
                    </div>
                    <ol className="space-y-2.5">
                        {STEPS.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand-ink">{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conexões ativas</p>
                    {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
                    {!data ? (
                        <Skeleton className="h-16 w-full rounded-lg" />
                    ) : count === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            Nenhum cliente conectado ainda.
                        </div>
                    ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                            {data.connections.map(c => (
                                <li key={c.id} className="flex items-start gap-3 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {c.client_name} <span className="font-normal text-muted-foreground">· {c.user_email}</span>
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Autorizado {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                                            {c.last_used_at && <> · usado {formatDistanceToNow(new Date(c.last_used_at), { addSuffix: true, locale: ptBR })}</>}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {c.scopes.map(s => (
                                                <Badge key={s} variant={s === "ads:write" ? "warning" : "neutral"} className="normal-case tracking-normal">
                                                    {MCP_SCOPES[s]?.label ?? s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => revoke(c)}
                                        disabled={revoking === c.id}
                                        title="Revogar acesso"
                                        aria-label={`Revogar acesso de ${c.client_name}`}
                                        className="hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        {revoking === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </IntegrationCard>
    );
}
