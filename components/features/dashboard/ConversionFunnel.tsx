'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Info } from 'lucide-react';
import { useMemo } from 'react';

interface FunnelStage {
    key: string;
    label: string;
    value: number;
    pct: number | null; // rate shown on the bridge TO this stage (null for first)
}

interface ConversionFunnelProps {
    impressions: number;
    clicks: number;
    viewContent: number;
    initiateCheckout: number;
    purchases: number;
}

function fmt(n: number) {
    return n.toLocaleString('pt-BR');
}
function fmtPct(n: number) {
    return `${n >= 10 ? n.toFixed(1) : n.toFixed(1)}%`;
}

function buildStages(
    impressions: number,
    clicks: number,
    viewContent: number,
    initiateCheckout: number,
    purchases: number,
): FunnelStage[] {
    const stages: FunnelStage[] = [];

    if (clicks > 0) {
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
        stages.push({ key: 'clicks', label: 'Cliques', value: clicks, pct: ctr });
    }
    if (viewContent > 0) {
        const rate = clicks > 0 ? (viewContent / clicks) * 100 : null;
        stages.push({ key: 'view_content', label: 'Vis. Página', value: viewContent, pct: rate });
    }
    if (initiateCheckout > 0) {
        const base = viewContent > 0 ? viewContent : clicks;
        const rate = base > 0 ? (initiateCheckout / base) * 100 : null;
        stages.push({ key: 'initiate_checkout', label: 'ICs', value: initiateCheckout, pct: rate });
    }
    if (purchases > 0) {
        const base = initiateCheckout > 0 ? initiateCheckout : (viewContent > 0 ? viewContent : clicks);
        const rate = base > 0 ? (purchases / base) * 100 : null;
        stages.push({ key: 'purchases', label: 'Compras', value: purchases, pct: rate });
    }

    return stages;
}

// Interpolate between blue (#3B82F6) → violet (#8B5CF6) → pink (#EC4899)
function stageColor(t: number): string {
    if (t <= 0.5) {
        const s = t / 0.5;
        return `rgb(${lerp(59, 139, s)},${lerp(130, 92, s)},${lerp(246, 246, s)})`;
    }
    const s = (t - 0.5) / 0.5;
    return `rgb(${lerp(139, 236, s)},${lerp(92, 72, s)},${lerp(246, 153, s)})`;
}
function lerp(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t);
}

export function ConversionFunnel({
    impressions, clicks, viewContent, initiateCheckout, purchases,
}: ConversionFunnelProps) {
    const stages = useMemo(
        () => buildStages(impressions, clicks, viewContent, initiateCheckout, purchases),
        [impressions, clicks, viewContent, initiateCheckout, purchases],
    );

    if (stages.length < 2) return null;

    // ── SVG layout ──────────────────────────────────────────────────────────────
    const VW        = 520;
    const VH        = 190;
    const PAD_X     = 36;
    const CENTER_Y  = 105;
    const MAX_BAR_H = 110;
    const MIN_BAR_H = 16;

    const n = stages.length;
    const maxVal  = Math.max(...stages.map(s => s.value));
    const xs      = stages.map((_, i) => PAD_X + i * ((VW - 2 * PAD_X) / (n - 1)));
    const hs      = stages.map(s => MIN_BAR_H + (s.value / maxVal) * (MAX_BAR_H - MIN_BAR_H));
    const colors  = stages.map((_, i) => stageColor(i / Math.max(n - 1, 1)));

    // Bezier bridge between stage i and i+1
    const bridgePath = (i: number) => {
        const x1 = xs[i], x2 = xs[i + 1];
        const t1 = CENTER_Y - hs[i] / 2,   b1 = CENTER_Y + hs[i] / 2;
        const t2 = CENTER_Y - hs[i+1] / 2, b2 = CENTER_Y + hs[i+1] / 2;
        const mx = (x1 + x2) / 2;
        return `M${x1} ${t1} C${mx} ${t1} ${mx} ${t2} ${x2} ${t2} L${x2} ${b2} C${mx} ${b2} ${mx} ${b1} ${x1} ${b1}Z`;
    };

    return (
        <GlassCard className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Funil de Conversão (Meta Ads)</h3>
                <Info className="w-4 h-4 text-muted-foreground opacity-40" />
            </div>

            <div className="w-full overflow-x-auto">
                <svg
                    viewBox={`0 0 ${VW} ${VH}`}
                    className="w-full"
                    style={{ minWidth: 280, maxHeight: 210 }}
                >
                    <defs>
                        {stages.slice(0, -1).map((_, i) => (
                            <linearGradient
                                key={i}
                                id={`fg${i}`}
                                gradientUnits="userSpaceOnUse"
                                x1={xs[i]} y1={CENTER_Y}
                                x2={xs[i + 1]} y2={CENTER_Y}
                            >
                                <stop offset="0%"   stopColor={colors[i]}   stopOpacity="0.82" />
                                <stop offset="100%" stopColor={colors[i+1]} stopOpacity="0.82" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Bridge shapes */}
                    {stages.slice(0, -1).map((_, i) => (
                        <path key={i} d={bridgePath(i)} fill={`url(#fg${i})`} />
                    ))}

                    {/* Thin accent bar at each stage */}
                    {stages.map((_, i) => (
                        <rect
                            key={i}
                            x={xs[i] - 2}
                            y={CENTER_Y - hs[i] / 2}
                            width={4}
                            height={hs[i]}
                            rx={2}
                            fill={colors[i]}
                        />
                    ))}

                    {/* Column header labels */}
                    {stages.map((s, i) => (
                        <text key={i} x={xs[i]} y={13}
                            textAnchor="middle" fontSize={9} fontWeight="600"
                            fill="rgb(156,163,175)" fontFamily="ui-sans-serif,system-ui,sans-serif"
                        >
                            {s.label}
                        </text>
                    ))}

                    {/* Percentage on each bridge (rate into NEXT stage) */}
                    {/* First stage: show its own pct (CTR) at its column */}
                    {stages[0].pct !== null && (
                        <text x={xs[0]} y={CENTER_Y + 1}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={11} fontWeight="700" fill="white"
                            fontFamily="ui-sans-serif,system-ui,sans-serif"
                        >
                            {fmtPct(stages[0].pct!)}
                        </text>
                    )}
                    {/* Stages 1…N: show their pct (rate from prev) at their bridge center */}
                    {stages.slice(1).map((s, i) => {
                        if (s.pct === null) return null;
                        const bx = (xs[i] + xs[i + 1]) / 2;
                        return (
                            <text key={i} x={bx} y={CENTER_Y + 1}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={11} fontWeight="700" fill="white"
                                fontFamily="ui-sans-serif,system-ui,sans-serif"
                            >
                                {fmtPct(s.pct)}
                            </text>
                        );
                    })}

                    {/* Absolute value at bottom */}
                    {stages.map((s, i) => (
                        <text key={i} x={xs[i]} y={VH - 4}
                            textAnchor="middle" fontSize={9}
                            fill="rgb(156,163,175)" fontFamily="ui-sans-serif,system-ui,sans-serif"
                        >
                            {fmt(s.value)}
                        </text>
                    ))}
                </svg>
            </div>
        </GlassCard>
    );
}
