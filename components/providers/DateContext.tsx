"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DateRangePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month" | "maximum";

interface DateContextType {
    preset: DateRangePreset;
    setPreset: (preset: DateRangePreset) => void;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

const DateContext = createContext<DateContextType | undefined>(undefined);

function getDateRange(preset: DateRangePreset): { start: string, end: string } {
    const end = new Date();
    const start = new Date();

    // Reset time to end of day for end date, start of day for start date conceptually
    // Meta API expects 'YYYY-MM-DD'

    switch (preset) {
        case "today":
            // start is today
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
            end.setDate(0); // Last day of previous month
            break;
        case "maximum":
            return { start: '2020-01-01', end: end.toISOString().split('T')[0] }; // Arbitrary old date
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

export function DateProvider({ children }: { children: ReactNode }) {
    const [preset, setPreset] = useState<DateRangePreset>("last_30d");

    const { start, end } = getDateRange(preset);

    return (
        <DateContext.Provider value={{
            preset,
            setPreset,
            startDate: start,
            endDate: end
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
