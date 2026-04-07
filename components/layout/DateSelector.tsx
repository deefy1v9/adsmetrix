"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDate, DateRangePreset } from "@/components/providers/DateContext";

const datePresets: { label: string; value: DateRangePreset }[] = [
    { label: "Hoje", value: "today" },
    { label: "Ontem", value: "yesterday" },
    { label: "7 dias", value: "last_7d" },
    { label: "30 dias", value: "last_30d" },
    { label: "Este Mês", value: "this_month" },
    { label: "Mês Passado", value: "last_month" },
    { label: "Total", value: "maximum" },
];

export function DateSelector({ className }: { className?: string }) {
    const { preset, setPreset } = useDate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentPreset = datePresets.find(p => p.value === preset) || datePresets[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-full border border-border bg-card px-4 sm:px-5 py-2 sm:py-2.5 transition-all hover:border-primary hover:shadow-md shadow-sm active:scale-[0.98]",
                    className && "w-full justify-between",
                    isOpen && "border-primary ring-4 ring-primary/10 shadow-md"
                )}
            >
                <Calendar className={cn("h-4 w-4 transition-colors", isOpen ? "text-primary" : "text-foreground")} />
                <span className="text-sm font-bold text-foreground">
                    {currentPreset.label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 z-50 w-[200px] rounded-2xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left">
                    <div className="grid gap-0.5">
                        {datePresets.map((item) => {
                            const isSelected = preset === item.value;
                            return (
                                <button
                                    key={item.value}
                                    onClick={() => {
                                        setPreset(item.value);
                                        setIsOpen(false);
                                    }}
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
                    </div>
                </div>
            )}
        </div>
    );
}
