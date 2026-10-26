"use client";

import { useEffect, useState } from "react";
import { OverviewTable } from "@/components/features/overview/OverviewTable";
import { MonthlyCalendar } from "@/components/features/overview/MonthlyCalendar";
import { fetchGeneralOverviewAction, fetchMonthlyCalendarAction } from "@/actions/overview-actions";
import { Users, TrendingUp, Calendar as CalendarIcon, LayoutDashboard } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

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

    const handleRefresh = async () => {
        setMonthLoading(true);
        try {
            const [overview, monthly] = await Promise.all([
                fetchGeneralOverviewAction(),
                fetchMonthlyCalendarAction(currentYear, currentMonth)
            ]);
            setOverviewData(overview);
            setMonthlyData(monthly);
        } catch (error) {
            console.error("Failed to refresh data:", error);
        } finally {
            setMonthLoading(false);
        }
    };

    const totalLeads24h = overviewData.reduce((acc, item) => acc + item.leads24h, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Análise"
                title="Visão Geral"
                icon={LayoutDashboard}
                description="Leads e investimento consolidados de todas as contas."
            />

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <StatCard
                    label="Contas ativas"
                    icon={Users}
                    value={overviewData.length}
                    hint="Contas monitoradas agora"
                    loading={loading}
                />
                <StatCard
                    label="Leads hoje (total)"
                    icon={TrendingUp}
                    value={totalLeads24h}
                    hint="Últimas 24 horas"
                    loading={loading}
                    highlight
                />
                <StatCard
                    label="Leads este mês"
                    icon={CalendarIcon}
                    value={overviewData.reduce((acc, item) => acc + item.leadsMonth, 0)}
                    hint="Consolidado do mês"
                    loading={loading}
                />
            </div>

            <div className="space-y-4">
                <SectionTitle title="Detalhamento diário" description="Leads e custo por lead de cada conta, dia a dia" />
                <MonthlyCalendar
                    data={monthlyData}
                    onMonthChange={handleMonthChange}
                    onRefresh={handleRefresh}
                    loading={monthLoading || loading}
                />
            </div>

            <div className="space-y-4">
                <SectionTitle title="Resumo financeiro e de leads" description="Saldo disponível, última recarga e leads do mês por conta" />
                <OverviewTable data={overviewData} loading={loading} />
            </div>
        </div>
    );
}
