"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDate, DateRangePreset, toLocalISODate } from "@/components/providers/DateContext";

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
    return toLocalISODate(new Date());
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
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={cn(
                    "flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-xs transition-colors hover:bg-accent",
                    className && "w-full justify-between",
                    isOpen && "border-ring ring-2 ring-ring/20"
                )}
            >
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                    {label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 z-50 w-[240px] rounded-xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden">
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
                                            "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                                            isSelected
                                                ? "bg-accent text-foreground font-medium"
                                                : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span className="text-sm">{item.label}</span>
                                        {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
                                    </button>
                                );
                            })}

                            {/* Custom option */}
                            <button
                                onClick={() => setShowCustom(true)}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors mt-1",
                                    preset === "custom"
                                        ? "bg-accent text-foreground font-medium"
                                        : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="text-sm">Personalizado…</span>
                                {preset === "custom" && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
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
                                className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
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
