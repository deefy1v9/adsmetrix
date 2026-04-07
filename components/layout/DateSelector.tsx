"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDate, DateRangePreset } from "@/components/providers/DateContext";

const datePresets: { label: string; value: DateRangePreset }[] = [
    { label: "Hoje",          value: "today" },
    { label: "Ontem",         value: "yesterday" },
    { label: "7 dias",        value: "last_7d" },
    { label: "30 dias",       value: "last_30d" },
    { label: "Este Mês",      value: "this_month" },
    { label: "Mês Passado",   value: "last_month" },
    { label: "Total",         value: "maximum" },
];

function today() {
    return new Date().toISOString().split("T")[0];
}

export function DateSelector({ className }: { className?: string }) {
    const { preset, setPreset, setCustomRange, startDate, endDate } = useDate();
    const [isOpen, setIsOpen]           = useState(false);
    const [showCustom, setShowCustom]   = useState(false);
    const [customFrom, setCustomFrom]   = useState(startDate);
    const [customTo, setCustomTo]       = useState(today());
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentPreset = datePresets.find(p => p.value === preset);
    const label = preset === "custom"
        ? `${startDate} → ${endDate}`
        : currentPreset?.label ?? "Período";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowCustom(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handlePresetSelect(value: DateRangePreset) {
        setPreset(value);
        setShowCustom(false);
        setIsOpen(false);
    }

    function handleApplyCustom() {
        if (!customFrom || !customTo) return;
        const from = customFrom <= customTo ? customFrom : customTo;
        const to   = customFrom <= customTo ? customTo   : customFrom;
        setCustomRange(from, to);
        setIsOpen(false);
        setShowCustom(false);
    }

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <button
                onClick={() => { setIsOpen(!isOpen); setShowCustom(false); }}
                className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-full border border-border bg-card px-4 sm:px-5 py-2 sm:py-2.5 transition-all hover:border-primary hover:shadow-md shadow-sm active:scale-[0.98]",
                    className && "w-full justify-between",
                    isOpen && "border-primary ring-4 ring-primary/10 shadow-md"
                )}
            >
                <Calendar className={cn("h-4 w-4 shrink-0 transition-colors", isOpen ? "text-primary" : "text-foreground")} />
                <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[160px]">
                    {label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 z-50 w-[240px] rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left overflow-hidden">
                    {/* Presets */}
                    {!showCustom && (
                        <div className="p-1.5 grid gap-0.5">
                            {datePresets.map((item) => {
                                const isSelected = preset === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => handlePresetSelect(item.value)}
                                        className={cn(
                                            "flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200",
                                            isSelected
                                                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                                                : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span className="text-sm">{item.label}</span>
                                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                    </button>
                                );
                            })}

                            {/* Custom option */}
                            <button
                                onClick={() => setShowCustom(true)}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200 border-t border-border mt-1 pt-3",
                                    preset === "custom"
                                        ? "bg-primary text-primary-foreground shadow-sm font-bold"
                                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="text-sm">Personalizado</span>
                                {preset === "custom" && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                        </div>
                    )}

                    {/* Custom date range picker */}
                    {showCustom && (
                        <div className="p-4 space-y-3">
                            <button
                                onClick={() => setShowCustom(false)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                ← Voltar
                            </button>
                            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Intervalo personalizado</p>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">De</label>
                                    <input
                                        type="date"
                                        value={customFrom}
                                        max={today()}
                                        onChange={e => setCustomFrom(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Até</label>
                                    <input
                                        type="date"
                                        value={customTo}
                                        min={customFrom}
                                        max={today()}
                                        onChange={e => setCustomTo(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleApplyCustom}
                                disabled={!customFrom || !customTo}
                                className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                                Aplicar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
