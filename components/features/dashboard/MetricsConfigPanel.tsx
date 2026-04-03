'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import {
    DASHBOARD_METRIC_DEFS,
    DEFAULT_DASHBOARD_METRICS,
    type DashboardMetricKey,
} from '@/lib/dashboard-metrics-config';
import { saveDashboardMetricsConfigAction } from '@/actions/meta-actions';
import { cn } from '@/lib/utils';

const GROUPS = ['Desempenho', 'Pixel / Compras', 'Leads', 'Conversas'] as const;

interface MetricsConfigPanelProps {
    config: Record<DashboardMetricKey, boolean>;
    onClose: () => void;
    onSaved: (config: Record<DashboardMetricKey, boolean>) => void;
}

export function MetricsConfigPanel({ config, onClose, onSaved }: MetricsConfigPanelProps) {
    const [local, setLocal] = useState<Record<DashboardMetricKey, boolean>>({ ...config });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const toggle = (key: DashboardMetricKey) =>
        setLocal(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSave = async () => {
        setSaving(true);
        await saveDashboardMetricsConfigAction(local);
        setSaving(false);
        setSaved(true);
        onSaved(local);
        setTimeout(() => { setSaved(false); onClose(); }, 800);
    };

    const handleReset = () => setLocal({ ...DEFAULT_DASHBOARD_METRICS });

    return (
        <GlassCard className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-foreground">Métricas do Dashboard</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Escolha quais KPIs aparecem nos cards</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {GROUPS.map(group => {
                    const defs = DASHBOARD_METRIC_DEFS.filter(d => d.group === group);
                    return (
                        <div key={group} className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group}</p>
                            {defs.map(def => (
                                <label
                                    key={def.key}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                >
                                    <div
                                        onClick={() => toggle(def.key)}
                                        className={cn(
                                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                            local[def.key]
                                                ? 'bg-primary border-primary'
                                                : 'border-border group-hover:border-primary/60',
                                        )}
                                    >
                                        {local[def.key] && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm text-foreground leading-none">{def.label}</span>
                                    {def.description && (
                                        <span className="text-[10px] text-muted-foreground hidden xl:inline">{def.description}</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border">
                <Button onClick={handleReset} variant="secondary" className="text-xs h-8">
                    Restaurar padrão
                </Button>
                <Button onClick={handleSave} disabled={saving || saved} variant="primary" className="flex items-center gap-2 h-8 text-xs">
                    {saved
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Salvo!</>
                        : saving
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                            : 'Salvar configuração'}
                </Button>
            </div>
        </GlassCard>
    );
}
