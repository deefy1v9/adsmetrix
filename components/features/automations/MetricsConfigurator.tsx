import { CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export interface MetricConfigItem {
    id: string;
    label: string;
    key: string;
    format: 'currency' | 'number' | 'percentage';
    enabled: boolean;
}

export const DEFAULT_AVAILABLE_METRICS: Omit<MetricConfigItem, 'enabled'>[] = [
    // Tráfego
    { id: 'spend', label: 'Investimento Total', key: 'spend', format: 'currency' },
    { id: 'impressions', label: 'Impressões', key: 'impressions', format: 'number' },
    { id: 'reach', label: 'Alcance', key: 'reach', format: 'number' },
    { id: 'clicks', label: 'Cliques', key: 'clicks', format: 'number' },
    { id: 'cpc', label: 'Custo por Clique (CPC)', key: 'cpc', format: 'currency' },
    { id: 'cpm', label: 'Custo por Mil Impressões (CPM)', key: 'cpm', format: 'currency' },
    { id: 'ctr', label: 'Taxa de Cliques (CTR)', key: 'ctr', format: 'percentage' },
    // Leads & Vendas
    { id: 'leads', label: 'Leads Gerados (Total)', key: 'leads', format: 'number' },
    { id: 'leads_gtm', label: 'Leads GTM/Pixel', key: 'leads_gtm', format: 'number' },
    { id: 'leads_form', label: 'Leads Formulário', key: 'leads_form', format: 'number' },
    { id: 'sales', label: 'Vendas/Compras', key: 'sales', format: 'number' },
    // Engajamento
    { id: 'post_engagements', label: 'Engajamentos', key: 'post_engagements', format: 'number' },
    { id: 'comments', label: 'Comentários', key: 'comments', format: 'number' },
    { id: 'page_likes', label: 'Novos Seguidores', key: 'page_likes', format: 'number' },
    { id: 'video_views', label: 'Views de Vídeo', key: 'video_views', format: 'number' },
    // Financeiro
    { id: 'balance', label: 'Saldo Disponível', key: 'balance', format: 'currency' },
];

export const REPORT_PRESETS: Record<string, { label: string; enabled: string[] | 'all' }> = {
    traffic: {
        label: 'Tráfego',
        enabled: ['spend', 'impressions', 'clicks', 'cpc', 'ctr', 'leads', 'balance'],
    },
    engagement: {
        label: 'Engajamento/Seguidores',
        enabled: ['spend', 'impressions', 'reach', 'cpm', 'post_engagements', 'comments', 'page_likes', 'video_views', 'cpc', 'ctr'],
    },
    leads_sales: {
        label: 'Leads & Vendas',
        enabled: ['spend', 'impressions', 'clicks', 'cpc', 'leads', 'leads_gtm', 'leads_form', 'sales'],
    },
    full: {
        label: 'Completo',
        enabled: 'all',
    },
};

export function getDefaultMetricsConfig(savedConfig?: Record<string, boolean> | null): MetricConfigItem[] {
    return DEFAULT_AVAILABLE_METRICS.map(m => ({
        ...m,
        enabled: savedConfig && savedConfig[m.id] !== undefined ? savedConfig[m.id] : true
    }));
}

interface MetricsConfiguratorProps {
    metrics: MetricConfigItem[];
    onChange: (metrics: MetricConfigItem[]) => void;
}

export function MetricsConfigurator({ metrics, onChange }: MetricsConfiguratorProps) {
    const toggleMetric = (metricId: string) => {
        onChange(metrics.map(m =>
            m.id === metricId ? { ...m, enabled: !m.enabled } : m
        ));
    };

    const applyPreset = (presetKey: string) => {
        const preset = REPORT_PRESETS[presetKey];
        if (!preset) return;
        onChange(metrics.map(m => ({
            ...m,
            enabled: preset.enabled === 'all' ? true : (preset.enabled as string[]).includes(m.id)
        })));
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Métricas do Relatório</h4>
            <div className="flex flex-wrap gap-1 pb-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">Preset:</span>
                {Object.entries(REPORT_PRESETS).map(([key, preset]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className="text-[10px] px-2 py-1 rounded-full border border-border bg-muted hover:bg-accent hover:text-foreground text-muted-foreground transition-colors"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-2">
                {metrics.map((metric) => (
                    <button
                        key={metric.id}
                        type="button"
                        onClick={() => toggleMetric(metric.id)}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg border transition-all shadow-xs",
                            metric.enabled
                                ? "bg-card border-primary/30 text-foreground"
                                : "bg-muted border-border text-muted-foreground/50"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-4 h-4 rounded-md flex items-center justify-center transition-all",
                                metric.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                {metric.enabled ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-medium">{metric.label}</span>
                        </div>
                        {metric.enabled && <Badge variant="neutral" className="bg-primary/10 text-primary border-none text-[8px] py-0 h-4">ON</Badge>}
                    </button>
                ))}
            </div>
        </div>
    );
}
