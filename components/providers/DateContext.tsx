"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DateRangePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month" | "maximum" | "custom";

interface DateContextType {
    preset: DateRangePreset;
    setPreset: (preset: DateRangePreset) => void;
    setCustomRange: (start: string, end: string) => void;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

const DateContext = createContext<DateContextType | undefined>(undefined);

function getDateRange(preset: DateRangePreset): { start: string, end: string } {
    const end = new Date();
    const start = new Date();

    switch (preset) {
        case "today":
            break;
        case "yesterday":
            start.setDate(end.getDate() - 1);
            end.setDate(end.getDate() - 1);
            break;
        case "last_7d":
            start.setDate(end.getDate() - 7);
            break;
        case "last_30d":
            start.setDate(end.getDate() - 30);
            break;
        case "this_month":
            start.setDate(1);
            break;
        case "last_month":
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0);
            break;
        case "maximum":
            return { start: '2020-01-01', end: end.toISOString().split('T')[0] };
        case "custom":
            // handled separately via customStart/customEnd
            break;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

export function DateProvider({ children }: { children: ReactNode }) {
    const [preset, setPreset] = useState<DateRangePreset>("last_30d");
    const [customStart, setCustomStart] = useState<string>("");
    const [customEnd, setCustomEnd] = useState<string>("");

    const { start, end } = getDateRange(preset);

    const setCustomRange = (s: string, e: string) => {
        setCustomStart(s);
        setCustomEnd(e);
        setPreset("custom");
    };

    return (
        <DateContext.Provider value={{
            preset,
            setPreset,
            setCustomRange,
            startDate: preset === "custom" ? customStart : start,
            endDate:   preset === "custom" ? customEnd   : end,
        }}>
            {children}
        </DateContext.Provider>
    );
}

export function useDate() {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error("useDate must be used within a DateProvider");
    }
    return context;
}
