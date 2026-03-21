"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlyData {
    year: number;
    month: number;
    daysInMonth: number;
    accounts: Array<{
        id: string;
        name: string;
        days: Record<number, number>;
    }>;
}

interface MonthlyCalendarProps {
    data: MonthlyData;
    onMonthChange: (year: number, month: number) => void;
    loading?: boolean;
}

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthlyCalendar({ data, onMonthChange, loading }: MonthlyCalendarProps) {
    const handlePrevMonth = () => {
        const newMonth = data.month === 0 ? 11 : data.month - 1;
        const newYear = data.month === 0 ? data.year - 1 : data.year;
        onMonthChange(newYear, newMonth);
    };

    const handleNextMonth = () => {
        const newMonth = data.month === 11 ? 0 : data.month + 1;
        const newYear = data.month === 11 ? data.year + 1 : data.year;
        onMonthChange(newYear, newMonth);
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-400">Carregando calendário...</div>;
    }

    const days = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);

    return (
        <GlassCard className="border-border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <h3 className="text-lg font-black text-foreground tracking-tight">Evolução Diária de Leads</h3>
                <div className="flex items-center gap-6">
                    <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted border border-border hover:border-primary transition-all">
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="text-foreground font-black uppercase text-xs tracking-widest min-w-[140px] text-center">
                        {months[data.month]} {data.year}
                    </span>
                    <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted border border-border hover:border-primary transition-all">
                        <ChevronRight className="h-4 w-4 text-foreground" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 bg-muted border-b border-r border-border p-3 text-left min-w-[200px] text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                Conta de Anúncios
                            </th>
                            {days.map(day => (
                                <th key={day} className="border-b border-r border-border p-2 text-center min-w-[32px] text-[9px] font-bold text-muted-foreground">
                                    {day}
                                </th>
                            ))}
                            <th className="border-b border-border p-3 text-center text-[10px] font-black text-foreground uppercase tracking-widest bg-muted">
                                TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.accounts.map((acc, idx) => {
                            const accountTotal = Object.values(acc.days).reduce((sum, val) => sum + val, 0);
                            return (
                                <tr key={acc.id} className="hover:bg-muted transition-colors group">
                                    <td className="sticky left-0 z-10 bg-card group-hover:bg-muted border-b border-r border-border p-3 font-bold text-foreground text-xs truncate max-w-[200px] transition-colors">
                                        {acc.name}
                                    </td>
                                    {days.map(day => {
                                        const count = acc.days[day] || 0;
                                        return (
                                            <td key={day} className="border-b border-r border-border p-1 text-center transition-all">
                                                {count > 0 ? (
                                                    <div className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#1C1C1C] text-primary text-[10px] font-black shadow-sm scale-110">
                                                        {count}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/20 font-medium">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="border-b border-border p-3 text-center bg-muted transition-colors">
                                        <span className="text-xs font-black text-foreground">{accountTotal}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}
