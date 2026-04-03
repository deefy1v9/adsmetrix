'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface ConversionFunnelProps {
    impressions: number;
    clicks: number;
    viewContent: number;
    initiateCheckout: number;
    purchases: number;
    conversations: number;
    leads: number;
    leadsGtm: number;
}

type FunnelMode = 'purchases' | 'messages' | 'leads_meta' | 'leads_pixel' | 'leads_total';

const MODE_LABELS: Record<FunnelMode, string> = {
    purchases:   'Compras',
    messages:    'Mensagens',
    leads_meta:  'Leads Meta',
    leads_pixel: 'Leads Site',
    leads_total: 'Leads Total',
};

interface Stage {
    key: string;
    label: string;
    value: number;
    convRate: number | null; // conversion rate FROM previous stage
}

function pct(num: number, den: number): number | null {
    return den > 0 ? (num / den) * 100 : null;
}

function buildStages(mode: FunnelMode, p: ConversionFunnelProps): Stage[] {
    const { impressions, clicks, viewContent, initiateCheckout, purchases, conversations, leads, leadsGtm } = p;

    const first: Stage = { key: 'clicks', label: 'Cliques', value: clicks, convRate: pct(clicks, impressions) };

    switch (mode) {
        case 'purchases': {
            const s: Stage[] = [first];
            if (viewContent > 0)       s.push({ key: 'vc',  label: 'Vis. Página',      value: viewContent,       convRate: pct(viewContent, clicks) });
            if (initiateCheckout > 0)  s.push({ key: 'ic',  label: 'Iniciar Checkout',  value: initiateCheckout,  convRate: pct(initiateCheckout, viewContent || clicks) });
            if (purchases > 0)         s.push({ key: 'pur', label: 'Compras',            value: purchases,         convRate: pct(purchases, initiateCheckout || viewContent || clicks) });
            return s;
        }
        case 'messages':
            return [first, { key: 'conv', label: 'Mensagens', value: conversations, convRate: pct(conversations, clicks) }];
        case 'leads_meta':
            return [first, { key: 'lm',   label: 'Leads Meta', value: leads,         convRate: pct(leads, clicks) }];
        case 'leads_pixel': {
            const s: Stage[] = [first];
            if (viewContent > 0) s.push({ key: 'vc', label: 'Vis. Página',   value: viewContent, convRate: pct(viewContent, clicks) });
            s.push({ key: 'lp', label: 'Leads Site', value: leadsGtm, convRate: pct(leadsGtm, viewContent || clicks) });
            return s;
        }
        case 'leads_total': {
            const total = leads + leadsGtm;
            const s: Stage[] = [first];
            if (viewContent > 0) s.push({ key: 'vc', label: 'Vis. Página', value: viewContent, convRate: pct(viewContent, clicks) });
            s.push({ key: 'lt', label: 'Leads Total', value: total, convRate: pct(total, viewContent || clicks) });
            return s;
        }
    }
}

function detectMode(p: ConversionFunnelProps): FunnelMode {
    if (p.purchases > 0)     return 'purchases';
    if (p.conversations > 0) return 'messages';
    if (p.leadsGtm > 0)      return 'leads_pixel';
    if (p.leads > 0)         return 'leads_meta';
    return 'messages';
}

function availableModes(p: ConversionFunnelProps): FunnelMode[] {
    const m: FunnelMode[] = [];
    if (p.purchases > 0 || p.initiateCheckout > 0) m.push('purchases');
    if (p.conversations > 0)      m.push('messages');
    if (p.leads > 0)              m.push('leads_meta');
    if (p.leadsGtm > 0)          m.push('leads_pixel');
    if (p.leads + p.leadsGtm > 0) m.push('leads_total');
    if (m.length === 0) m.push('messages');
    return [...new Set(m)];
}

function fmtShort(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
}

// ── SVG wave renderer ─────────────────────────────────────────────────────────

// Build a smooth closed area path: top curve (left→right) + bottom curve (right→left)
function wavePath(
    xs: number[],
    tops: number[],
    bots: number[],
): string {
    const n = xs.length;
    if (n < 2) return '';

    // Top edge: left→right using cubic bezier (horizontal tangents)
    let d = `M${xs[0]},${tops[0]}`;
    for (let i = 0; i < n - 1; i++) {
        const mx = (xs[i] + xs[i + 1]) / 2;
        d += ` C${mx},${tops[i]} ${mx},${tops[i + 1]} ${xs[i + 1]},${tops[i + 1]}`;
    }
    // Right cap
    d += ` L${xs[n - 1]},${bots[n - 1]}`;
    // Bottom edge: right→left
    for (let i = n - 2; i >= 0; i--) {
        const mx = (xs[i] + xs[i + 1]) / 2;
        d += ` C${mx},${bots[i + 1]} ${mx},${bots[i]} ${xs[i]},${bots[i]}`;
    }
    return d + ' Z';
}

interface WaveSVGProps {
    stages: Stage[];
    width: number;
    height: number;
}

function WaveSVG({ stages, width, height }: WaveSVGProps) {
    const n      = stages.length;
    const PAD_X  = 52;
    const CY     = height / 2;
    const MAX_H  = height * 0.38;
    const MIN_H  = height * 0.06;
    const maxVal = Math.max(...stages.map(s => s.value));

    const xs  = stages.map((_, i) => PAD_X + i * ((width - 2 * PAD_X) / Math.max(n - 1, 1)));
    const hs  = stages.map(s => MIN_H + (s.value / maxVal) * (MAX_H - MIN_H));

    const tops = hs.map(h => CY - h);
    const bots = hs.map(h => CY + h);

    // 4 layers: main + 3 progressively smaller/more transparent behind
    const layers = [
        { scale: 1.00, opacity: 0.85 },
        { scale: 1.30, opacity: 0.25 },
        { scale: 1.55, opacity: 0.14 },
        { scale: 1.80, opacity: 0.08 },
    ];

    const gradId = 'waveGrad';

    return (
        <svg
            viewBox={`0 0 ${width} ${height + 20}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible', display: 'block' }}
        >
            <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#3B82F6" />
                    <stop offset="60%"  stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <filter id="waveBlur">
                    <feGaussianBlur stdDeviation="1.5" />
                </filter>
            </defs>

            {/* Wave layers — outer (blurred) to inner (sharp) */}
            {[...layers].reverse().map((layer, li) => {
                const scaledTops = tops.map((t, i) => CY - hs[i] * layer.scale);
                const scaledBots = bots.map((b, i) => CY + hs[i] * layer.scale);
                const path = wavePath(xs, scaledTops, scaledBots);
                const isOuter = li <= 1;
                return (
                    <path
                        key={li}
                        d={path}
                        fill={`url(#${gradId})`}
                        opacity={layer.opacity}
                        filter={isOuter ? 'url(#waveBlur)' : undefined}
                    />
                );
            })}

            {/* Dashed vertical lines + labels at each stage */}
            {stages.map((stage, i) => {
                const x    = xs[i];
                const top  = tops[i];
                const bot  = bots[i];
                const isFirst = i === 0;
                const convPct = stage.convRate;

                // top label: conversion rate from previous (or CTR for first)
                const topLabel   = convPct !== null ? `${convPct.toFixed(1)}%` : null;
                const topSubLabel = isFirst ? 'CTR' : '↓ conv.';

                return (
                    <g key={stage.key}>
                        {/* Dashed vertical line */}
                        <line
                            x1={x} y1={top - 18}
                            x2={x} y2={bot + 18}
                            stroke="white"
                            strokeOpacity="0.25"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                        />

                        {/* Top label — conversion % */}
                        {topLabel && (
                            <g>
                                <rect
                                    x={x - 22} y={top - 38}
                                    width={44} height={18}
                                    rx={9}
                                    fill={i === 0 ? 'white' : '#1e1b4b'}
                                    fillOpacity={i === 0 ? 0.15 : 0.8}
                                />
                                <text
                                    x={x} y={top - 25}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={9}
                                    fontWeight="700"
                                    fill="white"
                                    fontFamily="ui-sans-serif,system-ui,sans-serif"
                                >
                                    {topLabel}
                                </text>
                            </g>
                        )}

                        {/* Bottom label — absolute value */}
                        <text
                            x={x} y={bot + 30}
                            textAnchor="middle"
                            fontSize={9}
                            fill="rgba(255,255,255,0.5)"
                            fontFamily="ui-sans-serif,system-ui,sans-serif"
                        >
                            {fmtShort(stage.value)}
                        </text>

                        {/* Stage label at very bottom */}
                        <text
                            x={x} y={height - 2}
                            textAnchor="middle"
                            fontSize={8}
                            fontWeight="600"
                            fill="rgba(255,255,255,0.35)"
                            fontFamily="ui-sans-serif,system-ui,sans-serif"
                        >
                            {stage.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConversionFunnel(props: ConversionFunnelProps) {
    const defaultMode = useMemo(() => detectMode(props), []);
    const [mode, setMode] = useState<FunnelMode>(defaultMode);

    const stages = useMemo(() => buildStages(mode, props), [mode, props]);
    const modes  = useMemo(() => availableModes(props), [props]);

    if (props.clicks === 0) return null;

    // Summary stats: first + last stage
    const first = stages[0];
    const last  = stages[stages.length - 1];
    const overallRate = first.value > 0 ? ((last.value / first.value) * 100) : null;

    return (
        <GlassCard className="col-span-3 flex flex-col gap-0 overflow-hidden p-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Funil de Conversão</h3>
                    <div className="flex items-center gap-4 mt-2">
                        <div>
                            <p className="text-lg font-bold text-foreground leading-none">{fmtShort(first.value)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{first.label}</p>
                        </div>
                        {overallRate !== null && (
                            <div>
                                <p className="text-lg font-bold text-primary leading-none">{overallRate.toFixed(1)}%</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Taxa geral</p>
                            </div>
                        )}
                        <div>
                            <p className="text-lg font-bold text-foreground leading-none">{fmtShort(last.value)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{last.label}</p>
                        </div>
                    </div>
                </div>

                {/* Mode pills */}
                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                    {modes.map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                'px-2 py-1 rounded-md text-[10px] font-semibold transition-all',
                                mode === m
                                    ? 'bg-primary text-black'
                                    : 'bg-white/5 text-muted-foreground hover:bg-white/10',
                            )}
                        >
                            {MODE_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Wave chart — full bleed */}
            {stages.length < 2 ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground px-5">
                    Sem dados suficientes para este modo.
                </div>
            ) : (
                <div className="px-2 pb-5 w-full">
                    <WaveSVG stages={stages} width={420} height={150} />
                </div>
            )}
        </GlassCard>
    );
}
