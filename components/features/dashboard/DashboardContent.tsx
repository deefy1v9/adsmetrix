"use client";

import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { KPICards } from "./KPICards";
import { OverviewChart } from "./OverviewChart";
import { RecentLeads } from "./RecentLeads";
import { useEffect, useState } from "react";
import { fetchCampaignsAction, fetchWeeklyBreakdownAction } from "@/actions/meta-actions";
import { MetaCampaign } from "@/lib/balance-utils";
import { WeeklyDay } from "@/lib/meta-api";
import { CampaignsContent } from "@/components/features/campaigns/CampaignsContent";
import { CreativeGrid } from "./CreativeGrid";
import { SkeletonKPICard } from "@/components/ui/Skeleton";

export function DashboardContent() {
    const { selectedAccount } = useAccount();
    const { preset } = useDate();
    const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
    const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [metricFilter, setMetricFilter] = useState<'all' | 'sales' | 'leads_form' | 'leads_gtm'>('all');

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            fetchCampaignsAction(selectedAccount.id, preset)
                .then(setCampaigns)
                .catch(console.error)
                .finally(() => setLoading(false));

            fetchWeeklyBreakdownAction(selectedAccount.id)
                .then(setWeeklyData)
                .catch(console.error);
        }
    }, [selectedAccount, preset]);

    // Calculate aggregated stats from campaigns insights
    const stats = {
        spend: campaigns.reduce((acc, c) => acc + (parseFloat(c.insights?.spend || "0")), 0),
        impressions: campaigns.reduce((acc, c) => acc + (parseInt(c.insights?.impressions || "0")), 0),
        clicks: campaigns.reduce((acc, c) => acc + (parseInt(c.insights?.clicks || "0")), 0),
        conversions: campaigns.reduce((acc, c) => {
            if (metricFilter === 'sales') return acc + parseInt(c.insights?.sales || "0");
            if (metricFilter === 'leads_form') return acc + parseInt(c.insights?.leads_form || "0");
            if (metricFilter === 'leads_gtm') return acc + parseInt(c.insights?.leads_gtm || "0");
            // 'all' = leads nativo (form) + leads GTM (pixel) + vendas
            return acc
                + parseInt(c.insights?.leads_form || "0")
                + parseInt(c.insights?.leads_gtm || "0")
                + parseInt(c.insights?.sales || "0");
        }, 0),
        conversations: campaigns.reduce((acc, c) => acc + (parseInt(c.insights?.conversations || "0")), 0),
    };

    if (!selectedAccount) {
        return <div className="text-foreground">Selecione uma conta para ver o dashboard.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <select
                        value={metricFilter}
                        onChange={(e) => setMetricFilter(e.target.value as any)}
                        className="bg-card border border-border rounded-md px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8"
                    >
                        <option value="all">Métrica: Todas as Conversões</option>
                        <option value="sales">Métrica: Vendas GTM (Purchase)</option>
                        <option value="leads_form">Métrica: Leads (Nativo Meta)</option>
                        <option value="leads_gtm">Métrica: Leads GTM (Site/Pixel)</option>
                    </select>
                </div>
                {loading && <span className="text-sm text-muted-foreground whitespace-nowrap animate-pulse">Atualizando dados...</span>}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonKPICard key={i} />)}
                </div>
            ) : <KPICards
                spend={stats.spend}
                clicks={stats.clicks}
                conversions={stats.conversions}
                conversations={stats.conversations}
                costPerConversion={stats.conversions > 0 ? stats.spend / stats.conversions : 0}
                costPerConversation={stats.conversations > 0 ? stats.spend / stats.conversations : 0}
                accountBalance={selectedAccount.balance}
                isPrepay={selectedAccount.is_prepay_account}
                fundingSourceDetails={selectedAccount.funding_source_details}
                spendCap={selectedAccount.spend_cap}
                amountSpent={selectedAccount.amount_spent}
                preset={preset}
            />}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                <OverviewChart data={weeklyData} />
                <RecentLeads />
            </div>

            <CreativeGrid metricFilter={metricFilter} />

            <CampaignsContent metricFilter={metricFilter} />
        </div>
    );
}
