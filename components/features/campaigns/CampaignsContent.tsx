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
import { TrendingUp, Eye, MousePointer, DollarSign, MessageSquare } from "lucide-react";
import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { useEffect, useState } from "react";
import { fetchCampaignsAction } from "@/actions/meta-actions";
import { MetaCampaign } from "@/lib/balance-utils";
import { Skeleton } from "@/components/ui/Skeleton";

const statusMap: Record<string, "success" | "warning" | "neutral" | "danger" | "default"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    ARCHIVED: "neutral",
    DELETED: "danger",
};

export function CampaignsContent({ metricFilter = 'all' }: { metricFilter?: 'all' | 'sales' | 'leads_form' | 'leads_gtm' }) {
    const { selectedAccount } = useAccount();
    const { preset } = useDate();
    const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            fetchCampaignsAction(selectedAccount.id, preset)
                .then(setCampaigns)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [selectedAccount, preset]);

    if (!selectedAccount) {
        return <div className="text-foreground">Selecione uma conta para ver as campanhas.</div>;
    }

    const metricNames: Record<string, string> = {
        'all': 'Leads (Total)',
        'sales': 'Vendas (GTM)',
        'leads_form': 'Leads Form',
        'leads_gtm': 'Leads GTM'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">Performance das Campanhas</h2>
                    <p className="text-muted-foreground">
                        {loading ? "Carregando campanhas..." : `Visualizando campanhas da conta: ${selectedAccount.name}`}
                    </p>
                </div>
            </div>

            <GlassCard>
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Campanha</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Objetivo</TableHead>
                            <TableHead>
                                <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" /> Impressões
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center gap-1">
                                    <MousePointer className="h-3 w-3" /> Cliques
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> {metricNames[metricFilter]}
                                </div>
                            </TableHead>
                            <TableHead>CPC</TableHead>
                            <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <DollarSign className="h-3 w-3" /> Gasto
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-4 w-48 mb-1" />
                                        <Skeleton className="h-3 w-24" />
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : campaigns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Nenhuma campanha encontrada nesta conta.
                                </TableCell>
                            </TableRow>
                        ) : (
                            [...campaigns]
                                .sort((a, b) => {
                                    const spendA = parseFloat(a.insights?.spend || '0');
                                    const spendB = parseFloat(b.insights?.spend || '0');
                                    if (spendB !== spendA) return spendB - spendA; // maior gasto primeiro
                                    // tiebreaker: ACTIVE antes de pausadas
                                    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
                                    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
                                    return 0;
                                })
                                .map((campaign) => {
                                    const specificMetric =
                                        metricFilter === 'sales' ? campaign.insights?.sales :
                                            metricFilter === 'leads_form' ? campaign.insights?.leads_form :
                                                metricFilter === 'leads_gtm' ? campaign.insights?.leads_gtm :
                                                    campaign.insights?.leads;

                                    return (
                                        <TableRow key={campaign.id}>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{campaign.name}</div>
                                                <div className="text-xs text-muted-foreground">{campaign.id}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusMap[campaign.status] || "default"}>{campaign.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-zinc-400">{campaign.objective}</TableCell>
                                            <TableCell>{campaign.insights?.impressions || '-'}</TableCell>
                                            <TableCell>{campaign.insights?.clicks || '-'}</TableCell>
                                            <TableCell>{specificMetric || '0'}</TableCell>
                                            <TableCell>
                                                {campaign.insights?.cpc ? `R$ ${parseFloat(campaign.insights.cpc).toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {campaign.insights?.spend
                                                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(campaign.insights.spend))
                                                    : '-'
                                                }
                                            </TableCell>
                                        </TableRow>
                                    );
                                }))}
                    </TableBody>
                </Table>
                </div>
            </GlassCard>
        </div>
    );
}
