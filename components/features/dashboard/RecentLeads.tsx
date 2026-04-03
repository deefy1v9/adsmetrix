"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAccount } from "@/components/providers/AccountContext";
import { useEffect, useState } from "react";
import { fetchLeadsAction } from "@/actions/meta-actions";
import { MetaLead } from "@/lib/balance-utils";
import { Skeleton } from "@/components/ui/Skeleton";

export function RecentLeads() {
    const { selectedAccount } = useAccount();
    const [leads, setLeads] = useState<MetaLead[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            fetchLeadsAction(selectedAccount.id)
                .then(data => setLeads(data.slice(0, 5))) // Limit to 5 for recent
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [selectedAccount]);

    const getField = (lead: MetaLead, name: string) => {
        const field = lead.field_data?.find(f => f.name === name);
        return field?.values?.[0] || "-";
    };

    return (
        <GlassCard className="col-span-4 lg:col-span-3">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Últimos Leads Recebidos</h3>
                    <p className="text-sm text-muted-foreground">Atividade recente das suas campanhas</p>
                </div>
                <Button variant="outline" size="sm">
                    <Link href="/leads">Ver todos</Link>
                </Button>
            </div>

            <div className="space-y-6">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton variant="circle" className="w-10 h-10" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3 w-36" />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-right">
                                <Skeleton className="h-3.5 w-14 ml-auto" />
                                <Skeleton className="h-3 w-10 ml-auto" />
                            </div>
                        </div>
                    ))
                ) : leads.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground italic">Nenhum lead recente.</div>
                ) : (
                    leads.map((lead) => {
                        const email = getField(lead, 'email');
                        const name = getField(lead, 'full_name') !== '-' ? getField(lead, 'full_name') : (email !== '-' ? email.split('@')[0] : 'Lead');
                        const initials = name
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                        return (
                            <div key={lead.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-foreground text-sm leading-tight truncate">{name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{email !== '-' ? email : 'Lead Meta Ads'}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-xs font-bold text-foreground">
                                        {new Date(lead.created_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                        {new Date(lead.created_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </GlassCard>
    );
}
