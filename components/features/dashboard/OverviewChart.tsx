"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
    AreaChart,
    Area,
    Grid,
    XAxis,
    YAxis,
    ChartTooltip,
} from "@/components/ui/area-chart";
import { useMemo } from "react";

interface WeeklyDay {
    name: string;
    leads: number;
    spend: number;
}

// Maps Portuguese day abbreviations → days-ago offset (0 = today)
const DAY_OFFSETS: Record<string, number> = {
    Dom: 6, Seg: 5, Ter: 4, Qua: 3, Qui: 2, Sex: 1, Sáb: 0,
};

export function OverviewChart({ data }: { data: WeeklyDay[] }) {
    // Convert string day names to real Date timestamps so scaleTime works
    const chartData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return data
            .map((d, i) => {
                const offset = DAY_OFFSETS[d.name] ?? (data.length - 1 - i);
                const date = new Date(today);
                date.setDate(today.getDate() - offset);
                return { ...d, date: date.getTime() };
            })
            .sort((a, b) => a.date - b.date);
    }, [data]);

    return (
        <GlassCard className="col-span-4 lg:col-span-4">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Performance Semanal</h3>
                <p className="text-sm text-muted-foreground">Relação entre investimento e leads.</p>
            </div>

            <div className="h-[300px] w-full">
                <AreaChart
                    data={chartData}
                    xKey="date"
                    margin={{ top: 12, right: 16, bottom: 36, left: 44 }}
                    animationDuration={900}
                >
                    <Grid
                        horizontal
                        vertical={false}
                        numTicksRows={4}
                        strokeDasharray="3,4"
                    />

                    <Area
                        dataKey="leads"
                        fill="#b4f13d"
                        fillOpacity={0.25}
                        stroke="#b4f13d"
                        strokeWidth={2.5}
                        gradientToOpacity={0}
                        fadeEdges
                        animate
                        showLine
                        showHighlight
                    />

                    <XAxis numTicks={7} tickerHalfWidth={40} />

                    <YAxis
                        numTicks={4}
                        formatValue={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                        }
                    />

                    <ChartTooltip
                        showDatePill
                        showCrosshair
                        showDots
                        rows={(point) => [
                            {
                                color: "#b4f13d",
                                label: "Leads",
                                value: typeof point.leads === "number" ? point.leads : 0,
                            },
                            {
                                color: "#5a9bff",
                                label: "Gasto",
                                value:
                                    typeof point.spend === "number"
                                        ? `R$ ${point.spend.toLocaleString("pt-BR", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                          })}`
                                        : "R$ 0,00",
                            },
                        ]}
                    />
                </AreaChart>
            </div>
        </GlassCard>
    );
}
