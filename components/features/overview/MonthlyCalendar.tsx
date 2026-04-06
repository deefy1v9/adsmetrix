"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface DayData {
    leads: number;
    spend: number;
}

interface MonthlyData {
    year: number;
    month: number;
    daysInMonth: number;
    accounts: Array<{
        id: string;
        name: string;
        days: Record<number, DayData>;
    }>;
}

interface MonthlyCalendarProps {
    data: MonthlyData;
    onMonthChange: (year: number, month: number) => void;
    onRefresh?: () => void;
    loading?: boolean;
}

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STORAGE_KEY = "cpl_thresholds";
const DEFAULT_THRESHOLD = 10;

function formatCPL(spend: number, leads: number, decimals = 0): string | null {
    if (leads === 0 || spend === 0) return null;
    const cpl = spend / leads;
    return cpl.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function loadThresholds(): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

export function MonthlyCalendar({ data, onMonthChange, onRefresh, loading }: MonthlyCalendarProps) {
    const [thresholds, setThresholds] = useState<Record<string, number>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setThresholds(loadThresholds());
    }, []);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const startEdit = (accId: string) => {
        const current = thresholds[accId] ?? DEFAULT_THRESHOLD;
        setEditValue(String(current));
        setEditingId(accId);
    };

    const confirmEdit = (accId: string) => {
        const num = parseFloat(editValue.replace(",", "."));
        if (!isNaN(num) && num > 0) {
            const next = { ...thresholds, [accId]: num };
            setThresholds(next);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        setEditingId(null);
    };

    const cancelEdit = () => setEditingId(null);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-5 border-b border-border">
                <h3 className="text-sm sm:text-lg font-black text-foreground tracking-tight">Evolução Diária de Leads</h3>
                <div className="flex items-center gap-2 sm:gap-4">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            title="Sincronizar dados"
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted border border-border hover:border-primary transition-all"
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-foreground" />
                        </button>
                    )}
                    <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted border border-border hover:border-primary transition-all">
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="text-foreground font-black uppercase text-xs tracking-widest min-w-[120px] sm:min-w-[140px] text-center">
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
                            <th className="sticky left-0 z-10 bg-muted border-b border-r border-border p-3 text-left min-w-[160px] sm:min-w-[220px] text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                Conta de Anúncios
                            </th>
                            {days.map(day => (
                                <th key={day} className="border-b border-r border-border p-2 text-center min-w-[36px] text-[9px] font-bold text-muted-foreground">
                                    {day}
                                </th>
                            ))}
                            <th className="border-b border-border p-3 text-center text-[10px] font-black text-foreground uppercase tracking-widest bg-muted">
                                TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.accounts.map((acc) => {
                            const accountTotal = Object.values(acc.days).reduce((sum, d) => sum + d.leads, 0);
                            const accountTotalSpend = Object.values(acc.days).reduce((sum, d) => sum + d.spend, 0);
                            const avgCPL = formatCPL(accountTotalSpend, accountTotal, 2);
                            const avgCPLValue = accountTotal > 0 ? accountTotalSpend / accountTotal : null;
                            const threshold = thresholds[acc.id] ?? DEFAULT_THRESHOLD;
                            const isEditing = editingId === acc.id;

                            return (
                                <tr key={acc.id} className="hover:bg-muted transition-colors group">
                                    <td className="sticky left-0 z-10 bg-card group-hover:bg-muted border-b border-r border-border p-3 transition-colors max-w-[160px] sm:max-w-[220px]">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-muted-foreground shrink-0">C/Lead ≤</span>
                                                <input
                                                    ref={inputRef}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") confirmEdit(acc.id);
                                                        if (e.key === "Escape") cancelEdit();
                                                    }}
                                                    className="w-14 px-1.5 py-0.5 text-xs rounded border border-primary bg-background text-foreground focus:outline-none"
                                                    placeholder="10"
                                                />
                                                <button onClick={() => confirmEdit(acc.id)} className="text-emerald-500 hover:text-emerald-400">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-foreground text-xs truncate">{acc.name}</span>
                                                <button
                                                    onClick={() => startEdit(acc.id)}
                                                    title={`Meta: R$${threshold} (clique para editar)`}
                                                    className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                {thresholds[acc.id] !== undefined && (
                                                    <span className="shrink-0 text-[9px] text-muted-foreground/50 font-medium">
                                                        ≤R${threshold}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {days.map(day => {
                                        const d = acc.days[day];
                                        const leads = d?.leads || 0;
                                        const cpl = d ? formatCPL(d.spend, d.leads, 2) : null;
                                        const cplValue = d && d.leads > 0 ? d.spend / d.leads : null;
                                        return (
                                            <td key={day} className="border-b border-r border-border p-1 text-center transition-all">
                                                {leads > 0 ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#1C1C1C] text-primary text-[10px] font-black shadow-sm">
                                                            {leads}
                                                        </div>
                                                        {cpl && cplValue !== null && (
                                                            <span className={cn(
                                                                "text-[8px] font-bold leading-none",
                                                                cplValue <= threshold ? "text-emerald-500" : "text-red-500"
                                                            )}>
                                                                {cpl}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/20 font-medium">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="border-b border-border p-3 text-center bg-muted transition-colors">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-xs font-black text-foreground">{accountTotal}</span>
                                            {avgCPL && avgCPLValue !== null && (
                                                <span className={cn(
                                                    "text-[9px] font-bold leading-none",
                                                    avgCPLValue <= threshold ? "text-emerald-500" : "text-red-500"
                                                )}>
                                                    {avgCPL}
                                                </span>
                                            )}
                                        </div>
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
