"use client";

import { useEffect, useState } from "react";
import { OverviewTable } from "@/components/features/overview/OverviewTable";
import { MonthlyCalendar } from "@/components/features/overview/MonthlyCalendar";
import { fetchGeneralOverviewAction, fetchMonthlyCalendarAction } from "@/actions/overview-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SkeletonKPICard, Skeleton } from "@/components/ui/Skeleton";

export default function OverviewPage() {
    const [overviewData, setOverviewData] = useState<any[]>([]);
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [monthLoading, setMonthLoading] = useState(false);

    const now = new Date();
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());

    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            try {
                const [overview, monthly] = await Promise.all([
                    fetchGeneralOverviewAction(),
                    fetchMonthlyCalendarAction(currentYear, currentMonth)
                ]);
                setOverviewData(overview);
                setMonthlyData(monthly);
            } catch (error) {
                console.error("Failed to load overview data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    const handleMonthChange = async (year: number, month: number) => {
        setMonthLoading(true);
        setCurrentYear(year);
        setCurrentMonth(month);
        try {
            const data = await fetchMonthlyCalendarAction(year, month);
            setMonthlyData(data);
        } catch (error) {
            console.error("Failed to load monthly data:", error);
        } finally {
            setMonthLoading(false);
        }
    };

    const totalLeads24h = overviewData.reduce((acc, item) => acc + item.leads24h, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">Visão Geral</h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estatísticas Consolidadas</p>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonKPICard key={i} />)}
                </div>
            ) : (
            <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                <GlassCard className="border-border hoverEffect">
                    <div className="flex flex-row items-center justify-between pb-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contas Ativas</h3>
                        <Users className="w-4 h-4 text-muted-foreground opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black text-foreground">{overviewData.length}</p>
                        <Badge variant="neon" className="px-2 py-0.5 text-[9px]">LIVE</Badge>
                    </div>
                </GlassCard>

                <GlassCard className="border-border hoverEffect">
                    <div className="flex flex-row items-center justify-between pb-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leads Hoje (Total)</h3>
                        <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black text-foreground">{totalLeads24h}</p>
                        <Badge variant="neon" className="px-2 py-0.5 text-[9px]">RESUMO 24H</Badge>
                    </div>
                </GlassCard>

                <GlassCard className="border-border hoverEffect">
                    <div className="flex flex-row items-center justify-between pb-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leads este Mês</h3>
                        <CalendarIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black text-foreground">
                            {overviewData.reduce((acc, item) => acc + item.leadsMonth, 0)}
                        </p>
                        <Badge variant="neon" className="px-2 py-0.5 text-[9px]">CONSOLIDADO</Badge>
                    </div>
                </GlassCard>
            </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1 h-6 bg-foreground rounded-full" />
                    <h3 className="text-lg font-black text-foreground tracking-tight">Detalhamento Diário</h3>
                </div>
                <MonthlyCalendar
                    data={monthlyData}
                    onMonthChange={handleMonthChange}
                    loading={monthLoading || loading}
                />
            </div>

            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h3 className="text-lg font-black text-foreground tracking-tight">Resumo Financeiro e de Leads</h3>
                </div>
                <OverviewTable data={overviewData} loading={loading} />
            </div>
        </div>
    );
}
