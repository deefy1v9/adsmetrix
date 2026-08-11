"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { getMetaTokenStatusAction, saveMetaTokenAction } from "@/actions/meta-actions";

type Status = Awaited<ReturnType<typeof getMetaTokenStatusAction>>;

const SOURCE_LABEL: Record<string, string> = {
    workspace: "Workspace",
    global: "Global (admin)",
    env: "Variável de ambiente",
};

/** expiresAt === 0 means the token never expires (System User token). */
function describeExpiry(expiresAt: number | null | undefined): { text: string; danger: boolean } {
    if (expiresAt === 0) return { text: "Não expira (Usuário do Sistema)", danger: false };
    if (expiresAt == null) return { text: "Validade desconhecida", danger: false };

    const msLeft = expiresAt * 1000 - Date.now();
    if (msLeft <= 0) return { text: "Expirado", danger: true };

    const hours = Math.floor(msLeft / 3_600_000);
    const date = new Date(expiresAt * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    if (hours < 48) return { text: `Expira em ~${hours}h (${date})`, danger: true };
    return { text: `Expira em ${Math.floor(hours / 24)} dias (${date})`, danger: false };
}

export function MetaTokenPanel() {
    const [status, setStatus] = useState<Status | null>(null);
    const [checking, setChecking] = useState(true);
    const [token, setToken] = useState("");
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    async function loadStatus() {
        setChecking(true);
        try {
            setStatus(await getMetaTokenStatusAction());
        } finally {
            setChecking(false);
        }
    }

    useEffect(() => { loadStatus(); }, []);

    async function handleSave() {
        setSaving(true);
        setFeedback(null);
        setWarning(null);
        try {
            const res = await saveMetaTokenAction(token);
            if (res.success) {
                setToken("");
                const parts = [`Token salvo para ${res.userName} — ${res.accountsCount} conta(s) acessível(is).`];
                if (res.longLived) parts.push("Convertido para token de longa duração (60 dias).");
                if (res.clearedOverrides) parts.push(`${res.clearedOverrides} token(s) antigo(s) por conta foram limpos.`);
                setFeedback({ ok: true, message: parts.join(" ") });
                setWarning(res.warning ?? null);
                await loadStatus();
            } else {
                setFeedback({ ok: false, message: res.error ?? "Não foi possível salvar o token." });
            }
        } catch (err: any) {
            setFeedback({ ok: false, message: err.message ?? "Erro inesperado." });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">Token de Acesso Meta</p>
                <div className="flex items-center gap-2">
                    {checking ? (
                        <Badge variant="neutral" className="text-[10px] uppercase">Verificando…</Badge>
                    ) : status?.valid ? (
                        <Badge variant="success" className="text-[10px] uppercase">Ativo</Badge>
                    ) : status?.hasToken ? (
                        <Badge variant="danger" className="text-[10px] uppercase">Inválido</Badge>
                    ) : (
                        <Badge variant="neutral" className="text-[10px] uppercase">Ausente</Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={loadStatus}
                        disabled={checking}
                        title="Revalidar token"
                    >
                        <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {!checking && status && (
                <div className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5">
                    {status.hasToken ? (
                        <>
                            <p>
                                <span className="font-mono">{status.maskedToken}</span>
                                {status.source && <> · origem: {SOURCE_LABEL[status.source] ?? status.source}</>}
                            </p>
                            {status.valid ? (
                                <>
                                    <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                        {status.userName} · {status.accountsCount} conta(s) de anúncio visível(is)
                                    </p>
                                    {(() => {
                                        const exp = describeExpiry(status.expiresAt);
                                        return (
                                            <p className={exp.danger ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                                                Validade: {exp.text}
                                            </p>
                                        );
                                    })()}
                                </>
                            ) : (
                                <p className="text-destructive flex items-start gap-1">
                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                    <span>{status.error}</span>
                                </p>
                            )}
                            {status.appCredentialsConfigured === false && (
                                <p className="text-amber-600 dark:text-amber-400">
                                    META_APP_ID / META_APP_SECRET não configurados — tokens curtos não podem ser
                                    estendidos para 60 dias automaticamente.
                                </p>
                            )}
                            {!!status.overrideCount && status.overrideCount > 0 && (
                                <p className="text-amber-600 dark:text-amber-400">
                                    {status.overrideCount} conta(s) com token próprio sobrepondo o token do workspace.
                                    Salvar um novo token limpa essas sobreposições.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>Nenhum token configurado — por isso a lista de contas aparece vazia.</span>
                        </p>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Cole aqui o novo token de acesso"
                    className="h-8 text-xs"
                    autoComplete="off"
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={saving || !token.trim()}
                    className="shrink-0"
                >
                    Salvar
                </Button>
            </div>

            {feedback && (
                <p className={`text-[10px] leading-relaxed ${feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {feedback.message}
                </p>
            )}

            {warning && (
                <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-400 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{warning}</span>
                </p>
            )}

            <p className="text-[10px] text-muted-foreground leading-relaxed">
                O token é validado na Meta antes de ser salvo e substitui o anterior deste workspace.
                Use um token de Usuário do Sistema (Gerenciador de Negócios → Configurações → Usuários do Sistema)
                para não precisar renová-lo a cada 60 dias. Permissões necessárias: <code>ads_read</code>,
                <code> leads_retrieval</code>, <code>pages_show_list</code>.
            </p>
        </div>
    );
}
