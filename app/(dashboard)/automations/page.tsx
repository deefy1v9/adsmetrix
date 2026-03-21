"use client";

import { useEffect, useState } from "react";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Loader2, Zap, Search, MessageSquare } from "lucide-react";
import { MetaAdAccount } from "@/lib/meta-api";

export default function AutomationsPage() {
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadAccounts();
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    Automações
                </h1>
                <p className="text-muted-foreground">
                    Gerencie os envios automáticos de relatórios via WhatsApp Business.
                </p>
                <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    A integração com WhatsApp Business será configurada em breve.
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
                        Relatórios Diários (WhatsApp Business)
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary w-8 h-8" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {accounts
                                .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
                                .map(account => (
                                <div key={account.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg border border-border gap-4">
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">{account.name}</div>
                                        <div className="text-sm text-muted-foreground/60">
                                            Automação via WhatsApp Business — configuração em breve
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-sm font-medium text-foreground">
                                                {account.daily_report_enabled ? "Ativo" : "Desativado"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Horário: {account.daily_report_time || "09:00"}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={account.daily_report_enabled || false}
                                            onCheckedChange={() => {}}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            ))}

                            {accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
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
