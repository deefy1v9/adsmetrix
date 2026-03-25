"use client";

import { useEffect, useState } from "react";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import {
    getUazAPIStatusAction,
    toggleDailyReportAction,
    getWorkspaceSettingAction,
    toggleCombinedReportAction,
} from "@/actions/uazapi-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader2, Zap, Search, MessageSquare, Wifi, WifiOff, Building2, Layers, Save, CheckCircle2, Terminal, Clock } from "lucide-react";
import { MetaAdAccount } from "@/lib/meta-api";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AutomationsPage() {
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [waConfigured, setWaConfigured] = useState(false);
    const [waConnected, setWaConnected] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Combined report state
    const [combinedEnabled, setCombinedEnabled] = useState(false);
    const [savingCombined, setSavingCombined] = useState(false);
    const [combinedSaved, setCombinedSaved] = useState(false);

    useEffect(() => {
        Promise.all([loadAccounts(), checkWAStatus(), loadCombinedConfig()]);
    }, []);

    async function loadAccounts() {
        try {
            const data = await fetchAdAccountsAction();
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts", error);
        } finally {
            setLoading(false);
        }
    }

    async function checkWAStatus() {
        const status = await getUazAPIStatusAction();
        setWaConfigured(status.configured);
        setWaConnected(status.connected && status.loggedIn);
    }

    async function loadCombinedConfig() {
        const setting = await getWorkspaceSettingAction();
        setCombinedEnabled(setting?.combined_report_enabled ?? false);
    }

    async function handleToggle(account: MetaAdAccount, enabled: boolean) {
        setTogglingId(account.id);
        const res = await toggleDailyReportAction(account.id, enabled);
        if (res.success) {
            setAccounts(prev => prev.map(a =>
                a.id === account.id ? { ...a, daily_report_enabled: enabled } : a
            ));
        }
        setTogglingId(null);
    }

    async function handleSaveCombined() {
        setSavingCombined(true);
        setCombinedSaved(false);
        await toggleCombinedReportAction(combinedEnabled);
        setSavingCombined(false);
        setCombinedSaved(true);
        setTimeout(() => setCombinedSaved(false), 3000);
    }

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    const activeAccounts = accounts.filter(a => a.daily_report_enabled);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Automações</h1>
                <p className="text-muted-foreground">
                    Gerencie os envios automáticos de relatórios diários via WhatsApp.
                </p>

                {/* WA Status banner */}
                <div className="mt-3">
                    {waConnected ? (
                        <div className="inline-flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                            <Wifi className="h-4 w-4" />
                            WhatsApp conectado — envios automáticos ativos
                        </div>
                    ) : waConfigured ? (
                        <div className="inline-flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                            <WifiOff className="h-4 w-4" />
                            WhatsApp configurado mas desconectado —{" "}
                            <Link href="/whatsapp-reports" className="underline underline-offset-2 hover:text-amber-300">
                                reconectar
                            </Link>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp não configurado —{" "}
                            <Link href="/whatsapp-reports" className="underline underline-offset-2 hover:text-foreground">
                                configurar agora
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Per-account daily reports ── */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar conta..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            <GlassCard>
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                        <Zap className="text-amber-500" />
                        Relatórios Diários Individuais
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary w-8 h-8" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map(account => (
                                <div
                                    key={account.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg border border-border gap-4"
                                >
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">{account.name}</div>
                                        <div className="text-sm text-muted-foreground/60">
                                            {waConfigured
                                                ? `Horário: ${account.daily_report_time || "09:00"}`
                                                : "Configure o WhatsApp para ativar envios automáticos"}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-sm font-medium text-foreground">
                                                {account.daily_report_enabled ? "Ativo" : "Inativo"}
                                            </div>
                                            {account.daily_report_enabled && (
                                                <Badge variant="success" className="text-[10px] mt-0.5">AGENDADO</Badge>
                                            )}
                                        </div>
                                        {togglingId === account.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        ) : (
                                            <Switch
                                                checked={account.daily_report_enabled || false}
                                                onCheckedChange={(checked) => handleToggle(account, checked)}
                                                disabled={!waConfigured}
                                                title={waConfigured ? undefined : "Configure o WhatsApp primeiro"}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    Nenhuma conta encontrada.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* ── Combined daily report ── */}
            <GlassCard>
                <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Layers className="text-primary" />
                                Relatório Combinado Diário
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Envia um único relatório consolidando todas as contas com envio ativo, no mesmo horário.
                            </p>
                        </div>
                        <Switch
                            checked={combinedEnabled}
                            onCheckedChange={setCombinedEnabled}
                            disabled={!waConfigured}
                            title={waConfigured ? undefined : "Configure o WhatsApp primeiro"}
                        />
                    </div>

                    {/* Accounts that will be included */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Contas incluídas no combinado
                        </p>
                        {activeAccounts.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                                <Building2 className="w-4 h-4 shrink-0" />
                                Nenhuma conta com envio individual ativo. Ative contas acima para incluí-las.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {activeAccounts.map(a => (
                                    <div
                                        key={a.id}
                                        className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm"
                                    >
                                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="font-medium text-foreground truncate">{a.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={handleSaveCombined}
                            disabled={savingCombined || !waConfigured}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            {savingCombined
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                                : <><Save className="w-4 h-4" /> Salvar Configuração</>}
                        </Button>
                        {combinedSaved && (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-in fade-in slide-in-from-left-2">
                                <CheckCircle2 className="w-4 h-4" /> Salvo!
                            </span>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* ── How to schedule ── */}
            <GlassCard>
                <div className="p-6 space-y-5">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Clock className="text-primary" />
                        Como Agendar o Disparo
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Os relatórios são disparados via endpoint HTTP. Configure um <strong className="text-foreground">cron job</strong> na sua VPS para chamar esse endpoint no horário desejado.
                    </p>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Endpoint de disparo
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-primary overflow-x-auto">
                            <Terminal className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <code>GET /api/cron/daily-reports?token=SEU_CRON_SECRET</code>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Exemplo — crontab (Linux/VPS) todos os dias às 09:00
                        </p>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-emerald-400 overflow-x-auto whitespace-pre">
{`0 9 * * * curl -s "https://SEU_DOMINIO/api/cron/daily-reports?token=SEU_CRON_SECRET"`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Substitua <code className="text-primary">SEU_DOMINIO</code> pelo seu domínio e <code className="text-primary">SEU_CRON_SECRET</code> pelo valor de <code className="text-primary">CRON_SECRET</code> no seu <code className="text-primary">.env</code>.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Testar manualmente agora
                        </p>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-amber-400 overflow-x-auto whitespace-pre">
{`curl -s "https://SEU_DOMINIO/api/cron/daily-reports?token=SEU_CRON_SECRET"`}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
