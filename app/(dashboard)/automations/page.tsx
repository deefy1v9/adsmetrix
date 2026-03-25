"use client";

import { useEffect, useState } from "react";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import { getUazAPIStatusAction, toggleDailyReportAction } from "@/actions/uazapi-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Zap, Search, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { MetaAdAccount } from "@/lib/meta-api";
import Link from "next/link";

export default function AutomationsPage() {
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [waConfigured, setWaConfigured] = useState(false);
    const [waConnected, setWaConnected] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([loadAccounts(), checkWAStatus()]);
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

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
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
                        Relatórios Diários (WhatsApp)
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
        </div>
    );
}
