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
import { TrendingUp, TrendingDown, Eye, MousePointer, DollarSign } from "lucide-react";

const campaigns = [
    {
        id: "camp_987654321",
        name: "Campanha Branding 2024",
        status: "ACTIVE",
        impressions: 15420,
        clicks: 350,
        ctr: 2.33,
        spend: 450.00,
        cpc: 1.28,
    },
    {
        id: "camp_123123123",
        name: "Promoção Black Friday",
        status: "PAUSED",
        impressions: 50400,
        clicks: 1200,
        ctr: 2.38,
        spend: 1800.00,
        cpc: 1.50,
    },
    {
        id: "camp_456456456",
        name: "Retargeting Cart Abandonment",
        status: "ACTIVE",
        impressions: 8900,
        clicks: 180,
        ctr: 2.02,
        spend: 320.00,
        cpc: 1.77,
    },
];

const statusMap: Record<string, "neon" | "warning" | "neutral"> = {
    ACTIVE: "neon",
    PAUSED: "neutral",
    ARCHIVED: "neutral",
};

export function CampaignMetrics() {
    return (
        <GlassCard className="border-border mt-6">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground tracking-tight">Desempenho da Campanha</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Campanha</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10">Status</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10 text-center">
                            Impressões
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10 text-center">
                            Cliques
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10 text-center">CTR</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10 text-center">CPC</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-10 text-right">
                            Gasto Total
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.map((campaign) => (
                        <TableRow key={campaign.id} className="border-b border-border/50 hover:bg-accent transition-colors group">
                            <TableCell className="py-4">
                                <div className="font-bold text-foreground">{campaign.name}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-tight">ID: {campaign.id.slice(-8)}</div>
                            </TableCell>
                            <TableCell className="py-4">
                                <Badge variant={statusMap[campaign.status]} className="text-[9px] font-black">
                                    {campaign.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-center font-medium text-muted-foreground">{campaign.impressions.toLocaleString()}</TableCell>
                            <TableCell className="py-4 text-center font-medium text-muted-foreground">{campaign.clicks.toLocaleString()}</TableCell>
                            <TableCell className="py-4 text-center">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-bold text-xs ${campaign.ctr > 2 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {campaign.ctr}%
                                    {campaign.ctr > 2 && <TrendingUp className="h-3 w-3" />}
                                </div>
                            </TableCell>
                            <TableCell className="py-4 text-center font-bold text-foreground">R$ {campaign.cpc.toFixed(2)}</TableCell>
                            <TableCell className="py-4 text-right">
                                <span className="text-sm font-black text-foreground">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(campaign.spend)}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </GlassCard>
    );
}
