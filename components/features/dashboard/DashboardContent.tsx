"use client";

import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { KPICards, computeStats } from "./KPICards";
import { OverviewChart } from "./OverviewChart";
import { RecentLeads } from "./RecentLeads";
import { useEffect, useState } from "react";
import { fetchCampaignsAction, fetchWeeklyBreakdownAction, getDashboardMetricsConfigAction } from "@/actions/meta-actions";
import { MetaCampaign } from "@/lib/balance-utils";
import { WeeklyDay } from "@/lib/meta-api";
import { CampaignsContent } from "@/components/features/campaigns/CampaignsContent";
import { CreativeGrid } from "./CreativeGrid";
import { SkeletonKPICard } from "@/components/ui/Skeleton";
import { MetricsConfigPanel } from "./MetricsConfigPanel";
import { Settings2 } from "lucide-react";
import type { DashboardMetricKey } from "@/lib/dashboard-metrics-config";
import { DEFAULT_DASHBOARD_METRICS } from "@/lib/dashboard-metrics-config";

export function DashboardContent() {
    const { selectedAccount } = useAccount();
    const { preset } = useDate();
    const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
    const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [metricFilter, setMetricFilter] = useState<'all' | 'sales' | 'leads_form' | 'leads_gtm'>('all');
    const [showConfig, setShowConfig] = useState(false);
    const [metricsConfig, setMetricsConfig] = useState<Record<DashboardMetricKey, boolean>>({ ...DEFAULT_DASHBOARD_METRICS });

    useEffect(() => {
        getDashboardMetricsConfigAction().then(setMetricsConfig);
    }, []);

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

    const stats = computeStats(campaigns);

    if (!selectedAccount) {
        return <div className="text-foreground">Selecione uma conta para ver o dashboard.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
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
                <div className="flex items-center gap-3">
                    {loading && <span className="text-sm text-muted-foreground whitespace-nowrap animate-pulse">Atualizando dados...</span>}
                    <button
                        onClick={() => setShowConfig(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                        title="Configurar métricas"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Métricas
                    </button>
                </div>
            </div>

            {showConfig && (
                <MetricsConfigPanel
                    config={metricsConfig}
                    onClose={() => setShowConfig(false)}
                    onSaved={setMetricsConfig}
                />
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonKPICard key={i} />)}
                </div>
            ) : (
                <KPICards
                    stats={stats}
                    metricsConfig={metricsConfig}
                    accountBalance={selectedAccount.balance}
                    isPrepay={selectedAccount.is_prepay_account}
                    fundingSourceDetails={selectedAccount.funding_source_details}
                    spendCap={selectedAccount.spend_cap}
                    amountSpent={selectedAccount.amount_spent}
                    preset={preset}
                />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                <OverviewChart data={weeklyData} />
                <RecentLeads />
            </div>

            <CreativeGrid metricFilter={metricFilter} />

            <CampaignsContent metricFilter={metricFilter} />
        </div>
    );
}
