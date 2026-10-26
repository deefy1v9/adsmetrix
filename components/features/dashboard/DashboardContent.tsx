"use client";

import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { KPICards, computeStats } from "./KPICards";
import { OverviewChart } from "./OverviewChart";
import { useEffect, useState } from "react";
import { fetchCampaignsAction, fetchWeeklyBreakdownAction, getDashboardMetricsConfigAction } from "@/actions/meta-actions";
import { MetaCampaign } from "@/lib/balance-utils";
import { WeeklyDay } from "@/lib/meta-api";
import { CampaignsContent } from "@/components/features/campaigns/CampaignsContent";
import { CreativeGrid } from "./CreativeGrid";
import { SkeletonKPICard } from "@/components/ui/Skeleton";
import { MetricsConfigPanel } from "./MetricsConfigPanel";
import { ConversionFunnel } from "./ConversionFunnel";
import { BarChart3, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { DashboardMetricKey } from "@/lib/dashboard-metrics-config";
import { DEFAULT_DASHBOARD_METRICS } from "@/lib/dashboard-metrics-config";

export function DashboardContent() {
    const { selectedAccount } = useAccount();
    const { preset, startDate, endDate } = useDate();
    const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
    const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [metricFilter, setMetricFilter] = useState<'all' | 'sales' | 'leads_form' | 'leads_gtm'>('all');
    const [showConfig, setShowConfig] = useState(false);
    const [metricsConfig, setMetricsConfig] = useState<Record<DashboardMetricKey, boolean>>({ ...DEFAULT_DASHBOARD_METRICS });

    // Encode custom date range as "custom:YYYY-MM-DD:YYYY-MM-DD" so the API can use time_range
    const effectivePreset = preset === "custom" ? `custom:${startDate}:${endDate}` : preset;

    useEffect(() => {
        getDashboardMetricsConfigAction().then(setMetricsConfig);
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            fetchCampaignsAction(selectedAccount.id, effectivePreset)
                .then(setCampaigns)
                .catch(console.error)
                .finally(() => setLoading(false));

            fetchWeeklyBreakdownAction(selectedAccount.id)
                .then(setWeeklyData)
                .catch(console.error);
        }
    }, [selectedAccount, effectivePreset]);

    const stats = computeStats(campaigns);

    if (!selectedAccount) {
        return (
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Canais"
                    title="Meta Ads"
                    icon={BarChart3}
                    description="Investimento, conversões, criativos e campanhas da conta selecionada."
                />
                <EmptyState
                    icon={BarChart3}
                    title="Selecione uma conta"
                    description="Escolha uma conta de anúncio do Meta no seletor do topo para ver o dashboard."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Canais"
                title="Meta Ads"
                icon={BarChart3}
                description={<>Investimento, conversões e criativos de <span className="font-medium text-foreground">{selectedAccount.name}</span></>}
                actions={
                    <>
                        {loading && <span className="text-xs text-muted-foreground whitespace-nowrap animate-pulse">Atualizando...</span>}
                        <select
                            value={metricFilter}
                            onChange={(e) => setMetricFilter(e.target.value as any)}
                            aria-label="Filtrar conversões"
                            className="h-9 w-full xs:w-auto rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                        >
                            <option value="all">Todas as Conversões</option>
                            <option value="sales">Vendas GTM (Purchase)</option>
                            <option value="leads_form">Leads (Nativo Meta)</option>
                            <option value="leads_gtm">Leads GTM (Site/Pixel)</option>
                        </select>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfig(v => !v)}
                            title="Configurar métricas"
                        >
                            <Settings2 className="h-4 w-4" />
                            Métricas
                        </Button>
                    </>
                }
            />

            {showConfig && (
                <MetricsConfigPanel
                    config={metricsConfig}
                    onClose={() => setShowConfig(false)}
                    onSaved={setMetricsConfig}
                />
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <ConversionFunnel
                    impressions={campaigns.reduce((a, c) => a + parseInt(c.insights?.impressions || '0'), 0)}
                    clicks={stats.clicks}
                    viewContent={stats.view_content}
                    initiateCheckout={stats.initiate_checkout}
                    purchases={stats.purchases}
                    conversations={stats.conversations}
                    leads={campaigns.reduce((a, c) => a + parseInt(c.insights?.leads_form || '0'), 0)}
                    leadsGtm={campaigns.reduce((a, c) => a + parseInt(c.insights?.leads_gtm || '0'), 0)}
                />
            </div>

            <CreativeGrid metricFilter={metricFilter} />

            <CampaignsContent metricFilter={metricFilter} />
        </div>
    );
}
