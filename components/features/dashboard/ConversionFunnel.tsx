'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { useState, useMemo } from 'react';

interface FunnelStage {
    key: string;
    label: string;
    value: number;
    pct: number | null;
}

export interface ConversionFunnelProps {
    impressions: number;
    clicks: number;
    viewContent: number;
    initiateCheckout: number;
    purchases: number;
    conversations: number;
    leads: number;        // leads_form (Meta nativo)
    leadsGtm: number;     // leads_gtm (pixel)
}

type FunnelMode = 'purchases' | 'messages' | 'leads_meta' | 'leads_pixel' | 'leads_total';

const MODE_LABELS: Record<FunnelMode, string> = {
    purchases:   'Compras',
    messages:    'Mensagens',
    leads_meta:  'Leads Meta',
    leads_pixel: 'Leads Pixel',
    leads_total: 'Leads Total',
};

function fmt(n: number) { return n.toLocaleString('pt-BR'); }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

function stageColor(t: number): string {
    if (t <= 0.5) {
        const s = t / 0.5;
        return `rgb(${lerp(59,139,s)},${lerp(130,92,s)},${lerp(246,246,s)})`;
    }
    const s = (t - 0.5) / 0.5;
    return `rgb(${lerp(139,236,s)},${lerp(92,72,s)},${lerp(246,153,s)})`;
}

function buildStages(mode: FunnelMode, p: ConversionFunnelProps): FunnelStage[] {
    const { impressions, clicks, viewContent, initiateCheckout, purchases, conversations, leads, leadsGtm } = p;
    const ctr = impressions > 0 && clicks > 0 ? (clicks / impressions) * 100 : null;

    const clickStage: FunnelStage = { key: 'clicks', label: 'Cliques', value: clicks, pct: ctr };

    const rate = (num: number, den: number) => den > 0 ? (num / den) * 100 : null;

    switch (mode) {
        case 'purchases': {
            const stages: FunnelStage[] = [clickStage];
            if (viewContent > 0)
                stages.push({ key: 'view_content', label: 'Vis. Página', value: viewContent, pct: rate(viewContent, clicks) });
            if (initiateCheckout > 0) {
                const base = viewContent > 0 ? viewContent : clicks;
                stages.push({ key: 'initiate_checkout', label: 'ICs', value: initiateCheckout, pct: rate(initiateCheckout, base) });
            }
            if (purchases > 0) {
                const base = initiateCheckout > 0 ? initiateCheckout : (viewContent > 0 ? viewContent : clicks);
                stages.push({ key: 'purchases', label: 'Compras', value: purchases, pct: rate(purchases, base) });
            }
            return stages;
        }
        case 'messages': {
            const stages: FunnelStage[] = [clickStage];
            if (conversations > 0)
                stages.push({ key: 'conversations', label: 'Mensagens', value: conversations, pct: rate(conversations, clicks) });
            return stages;
        }
        case 'leads_meta': {
            const stages: FunnelStage[] = [clickStage];
            if (leads > 0)
                stages.push({ key: 'leads_meta', label: 'Leads Meta', value: leads, pct: rate(leads, clicks) });
            return stages;
        }
        case 'leads_pixel': {
            const stages: FunnelStage[] = [clickStage];
            if (viewContent > 0)
                stages.push({ key: 'view_content', label: 'Vis. Página', value: viewContent, pct: rate(viewContent, clicks) });
            if (leadsGtm > 0) {
                const base = viewContent > 0 ? viewContent : clicks;
                stages.push({ key: 'leads_pixel', label: 'Leads Site', value: leadsGtm, pct: rate(leadsGtm, base) });
            }
            return stages;
        }
        case 'leads_total': {
            const total = leads + leadsGtm;
            const stages: FunnelStage[] = [clickStage];
            if (viewContent > 0)
                stages.push({ key: 'view_content', label: 'Vis. Página', value: viewContent, pct: rate(viewContent, clicks) });
            if (total > 0) {
                const base = viewContent > 0 ? viewContent : clicks;
                stages.push({ key: 'leads_total', label: 'Leads', value: total, pct: rate(total, base) });
            }
            return stages;
        }
    }
}

// Detect best default mode based on non-zero data
function detectMode(p: ConversionFunnelProps): FunnelMode {
    if (p.purchases > 0)      return 'purchases';
    if (p.conversations > 0)  return 'messages';
    if (p.leadsGtm > 0)       return 'leads_pixel';
    if (p.leads > 0)          return 'leads_meta';
    return 'messages';
}

// Which modes have data
function availableModes(p: ConversionFunnelProps): FunnelMode[] {
    const modes: FunnelMode[] = [];
    if (p.purchases > 0 || p.initiateCheckout > 0 || p.viewContent > 0) modes.push('purchases');
    if (p.conversations > 0)            modes.push('messages');
    if (p.leads > 0)                    modes.push('leads_meta');
    if (p.leadsGtm > 0)                 modes.push('leads_pixel');
    if (p.leads + p.leadsGtm > 0)       modes.push('leads_total');
    if (modes.length === 0)             modes.push('messages'); // fallback
    return [...new Set(modes)];
}

export function ConversionFunnel(props: ConversionFunnelProps) {
    const defaultMode = useMemo(() => detectMode(props), []);
    const [mode, setMode] = useState<FunnelMode>(defaultMode);

    const stages = useMemo(() => buildStages(mode, props), [mode, props]);
    const modes  = useMemo(() => availableModes(props), [props]);

    if (props.clicks === 0) return null;

    // ── SVG layout ──────────────────────────────────────────────────────────────
    const VW       = 520;
    const VH       = 190;
    const PAD_X    = 36;
    const CY       = 105;   // vertical center
    const MAX_H    = 110;
    const MIN_H    = 16;

    const n      = stages.length;
    const maxVal = Math.max(...stages.map(s => s.value));
    const xs     = stages.map((_, i) => PAD_X + i * ((VW - 2 * PAD_X) / Math.max(n - 1, 1)));
    const hs     = stages.map(s => MIN_H + (s.value / maxVal) * (MAX_H - MIN_H));
    const colors = stages.map((_, i) => stageColor(i / Math.max(n - 1, 1)));

    const bridge = (i: number) => {
        const x1 = xs[i], x2 = xs[i + 1];
        const t1 = CY - hs[i] / 2,   b1 = CY + hs[i] / 2;
        const t2 = CY - hs[i+1] / 2, b2 = CY + hs[i+1] / 2;
        const mx = (x1 + x2) / 2;
        return `M${x1} ${t1}C${mx} ${t1} ${mx} ${t2} ${x2} ${t2}L${x2} ${b2}C${mx} ${b2} ${mx} ${b1} ${x1} ${b1}Z`;
    };

    return (
        <GlassCard className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-foreground">Funil de Conversão (Meta Ads)</h3>
                <div className="flex gap-1 flex-wrap">
                    {modes.map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                                mode === m
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                            }`}
                        >
                            {MODE_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>

            {/* SVG funnel */}
            {n < 2 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                    Sem dados suficientes para este modo no período selecionado.
                </p>
            ) : (
                <div className="w-full overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${VW} ${VH}`}
                        className="w-full"
                        style={{ minWidth: 260, maxHeight: 210 }}
                    >
                        <defs>
                            {stages.slice(0, -1).map((_, i) => (
                                <linearGradient
                                    key={i}
                                    id={`fg_${mode}_${i}`}
                                    gradientUnits="userSpaceOnUse"
                                    x1={xs[i]} y1={CY}
                                    x2={xs[i + 1]} y2={CY}
                                >
                                    <stop offset="0%"   stopColor={colors[i]}   stopOpacity="0.82" />
                                    <stop offset="100%" stopColor={colors[i+1]} stopOpacity="0.82" />
                                </linearGradient>
                            ))}
                        </defs>

                        {/* Bridge shapes */}
                        {stages.slice(0, -1).map((_, i) => (
                            <path key={i} d={bridge(i)} fill={`url(#fg_${mode}_${i})`} />
                        ))}

                        {/* Accent bar per stage */}
                        {stages.map((_, i) => (
                            <rect key={i}
                                x={xs[i] - 2} y={CY - hs[i] / 2}
                                width={4} height={hs[i]} rx={2}
                                fill={colors[i]}
                            />
                        ))}

                        {/* Column labels */}
                        {stages.map((s, i) => (
                            <text key={i} x={xs[i]} y={13}
                                textAnchor="middle" fontSize={9} fontWeight="600"
                                fill="rgb(156,163,175)" fontFamily="ui-sans-serif,system-ui,sans-serif"
                            >
                                {s.label}
                            </text>
                        ))}

                        {/* CTR on first stage column */}
                        {stages[0].pct !== null && (
                            <text x={xs[0]} y={CY + 1}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={11} fontWeight="700" fill="white"
                                fontFamily="ui-sans-serif,system-ui,sans-serif"
                            >
                                {fmtPct(stages[0].pct!)}
                            </text>
                        )}

                        {/* Conversion % on each bridge (center) */}
                        {stages.slice(1).map((s, i) => {
                            if (s.pct === null) return null;
                            const bx = n === 2 ? (xs[0] + xs[1]) / 2 : (xs[i] + xs[i + 1]) / 2;
                            return (
                                <text key={i} x={bx} y={CY + 1}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={11} fontWeight="700" fill="white"
                                    fontFamily="ui-sans-serif,system-ui,sans-serif"
                                >
                                    {fmtPct(s.pct)}
                                </text>
                            );
                        })}

                        {/* Absolute values at bottom */}
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
            )}
        </GlassCard>
    );
}
