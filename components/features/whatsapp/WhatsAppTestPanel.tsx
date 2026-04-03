'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAccount } from '@/components/providers/AccountContext';
import { useDate } from '@/components/providers/DateContext';
import { getCampaignMetricsAction } from '@/actions/whatsapp-actions';
import { sendTestMessageAction } from '@/actions/uazapi-actions';
import { Calendar, Send, CheckSquare, Square, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface MetricConfig {
    id: string;
    label: string;
    key: keyof CampaignInsights;
    format: 'currency' | 'number' | 'percentage';
    enabled: boolean;
}

interface CampaignInsights {
    impressions: string;
    clicks: string;
    spend: string;
    cpc: string;
    ctr: string;
    leads: string;
}

const AVAILABLE_METRICS: Omit<MetricConfig, 'enabled'>[] = [
    { id: 'balance', label: 'Saldo Disponível', key: 'spend', format: 'currency' }, // Special key handled in build
    { id: 'spend', label: 'Investimento Total', key: 'spend', format: 'currency' },
    { id: 'impressions', label: 'Impressões', key: 'impressions', format: 'number' },
    { id: 'clicks', label: 'Cliques', key: 'clicks', format: 'number' },
    { id: 'leads', label: 'Leads Gerados', key: 'leads', format: 'number' },
    { id: 'ctr', label: 'Taxa de Cliques (CTR)', key: 'ctr', format: 'percentage' },
    { id: 'cpc', label: 'Custo por Clique (CPC)', key: 'cpc', format: 'currency' },
];

export function WhatsAppReportBuilder() {
    const { selectedAccount } = useAccount();
    const { preset: datePreset } = useDate();

    const [metrics, setMetrics] = useState<MetricConfig[]>(
        AVAILABLE_METRICS.map(m => ({ ...m, enabled: true }))
    );
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [campaignData, setCampaignData] = useState<any>(null);
    const [reportCopy, setReportCopy] = useState('Olá! Segue o resumo do desempenho das nossas campanhas:');

    const COPY_TEMPLATES = [
        { label: 'Padrão', text: 'Olá! Segue o resumo do desempenho das nossas campanhas:' },
        { label: 'Formal', text: 'Prezado(a), enviamos em anexo os indicadores de performance das campanhas ativas no momento.' },
        { label: 'Casual', text: 'Oi! Passando para atualizar você sobre os resultados dos nossos anúncios. Dá uma olhada:' },
        { label: 'Foco em Vendas', text: 'Tivemos ótimos resultados em conversão hoje! Segue o detalhamento técnico do período:' },
    ];

    // Fetch campaign data when account or date changes
    useEffect(() => {
        if (selectedAccount) {
            fetchCampaignData();
        }
    }, [selectedAccount, datePreset]);

    const fetchCampaignData = async () => {
        if (!selectedAccount) return;

        setFetchingData(true);
        try {
            const response = await getCampaignMetricsAction(selectedAccount.id, datePreset);

            if (response.success && response.data) {
                setCampaignData(response.data);
            } else {
                console.error('Error fetching metrics:', response.error);
                setCampaignData(null);
            }
        } catch (error) {
            console.error('Error fetching campaign data:', error);
            setCampaignData(null);
        } finally {
            setFetchingData(false);
        }
    };

    const toggleMetric = (metricId: string) => {
        setMetrics(prev => prev.map(m =>
            m.id === metricId ? { ...m, enabled: !m.enabled } : m
        ));
    };

    const formatValue = (value: number | string, format: 'currency' | 'number' | 'percentage') => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        switch (format) {
            case 'currency':
                return `R$ ${numValue.toFixed(2).replace('.', ',')}`;
            case 'percentage':
                return `${numValue.toFixed(2)}%`;
            case 'number':
                return numValue.toLocaleString('pt-BR');
            default:
                return String(value);
        }
    };

    const calculateAvailableBalance = () => {
        if (!campaignData?.accountInfo) return 0;
        const { is_prepay, balance, spend_cap, funding_source_details } = campaignData.accountInfo;

        let displayBalance = 0;
        if (is_prepay) {
            if (funding_source_details?.display_string) {
                const match = funding_source_details.display_string.match(/R\$\s?([\d.,]+)/) ||
                    funding_source_details.display_string.match(/([\d.,]+)/);
                if (match) {
                    const rawValue = match[1].replace(/\./g, '').replace(',', '.');
                    displayBalance = parseFloat(rawValue);
                }
            }
            if (displayBalance === 0) {
                if (spend_cap && spend_cap > 0) {
                    displayBalance = Math.max(0, (spend_cap + (balance || 0)) / 100);
                } else {
                    displayBalance = Math.abs(balance || 0) / 100;
                }
            }
        } else {
            if (spend_cap && spend_cap > 0) {
                displayBalance = Math.max(0, (spend_cap - (campaignData.spend * 100)) / 100);
            }
        }
        return displayBalance;
    };

    const getDateLabel = () => {
        switch (datePreset) {
            case 'today': return 'Hoje';
            case 'yesterday': return 'Ontem';
            case 'last_7d': return 'Últimos 7 dias';
            case 'last_30d': return 'Últimos 30 dias';
            case 'this_month': return 'Este mês';
            case 'last_month': return 'Mês passado';
            case 'maximum': return 'Todo o período';
            default: return '';
        }
    };

    const buildReportMessage = () => {
        if (!campaignData) return '';

        const enabledMetrics = metrics.filter(m => m.enabled);
        const lines = enabledMetrics.map(metric => {
            let value;
            let label = metric.label;

            if (metric.id === 'balance') {
                value = calculateAvailableBalance();
                if (campaignData?.accountInfo && !campaignData.accountInfo.is_prepay) {
                    label = `${metric.label} (Saldo a ser cobrado no cartão)`;
                }
            } else {
                value = campaignData[metric.key];
            }
            const formatted = formatValue(value, metric.format);
            return `${label}: ${formatted}`;
        });

        const dateLabel = getDateLabel();
        const header = dateLabel ? `📊 *Relatório de Campanhas* (${dateLabel})` : `📊 *Relatório de Campanhas*`;

        return `${reportCopy}\n\n${header}\n\n${lines.join('\n')}`;
    };

    const handleSendReport = async () => {
        if (!campaignData) return;
        setLoading(true);
        setResult(null);
        const message = buildReportMessage();
        const res = await sendTestMessageAction(message);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
                <GlassCard className="border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6 tracking-tight">Configuração do Relatório</h3>

                    <div className="space-y-6">
                        {/* Account Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Conta de Anúncios Selecionada
                            </label>
                            <div className="p-4 bg-muted border border-border rounded-2xl flex justify-between items-center group">
                                <div>
                                    <p className="text-foreground font-bold">
                                        {selectedAccount?.name || 'Selecione uma conta no menu superior'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1">
                                        Meta Ads Platform
                                    </p>
                                </div>
                                {selectedAccount?.daily_report_enabled && (
                                    <Badge variant="neon" className="px-2 py-1">
                                        ATIVO
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Custom Copy */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Mensagem de Saudação
                            </label>
                            <textarea
                                className="w-full h-32 px-4 py-3 bg-muted border border-border rounded-2xl text-foreground font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-all resize-none shadow-sm"
                                placeholder="Olá! Segue o resumo..."
                                value={reportCopy}
                                onChange={(e) => setReportCopy(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {COPY_TEMPLATES.map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => setReportCopy(template.text)}
                                        className="text-[10px] font-bold px-3 py-1.5 bg-card border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-sm"
                                    >
                                        {template.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </GlassCard>

                <GlassCard className="border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6 tracking-tight">Métricas Selecionadas</h3>

                    <div className="grid grid-cols-1 gap-2">
                        {metrics.map((metric) => (
                            <button
                                key={metric.id}
                                onClick={() => toggleMetric(metric.id)}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-xl border transition-all shadow-sm",
                                    metric.enabled
                                        ? "bg-card border-primary/30 text-foreground"
                                        : "bg-muted border-border text-muted-foreground/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                                        metric.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {metric.enabled ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-sm font-bold">{metric.label}</span>
                                </div>
                                {metric.enabled && <Badge variant="neutral" className="bg-primary/10 text-primary border-none text-[8px]">ATIVO</Badge>}
                            </button>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Right Column - Preview & Send */}
            <div className="space-y-6">
                <GlassCard className="border-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/30" />
                    <h3 className="text-lg font-bold text-foreground mb-6 tracking-tight">Prévia do Relatório</h3>

                    {fetchingData ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FAFAFA] border-t-primary"></div>
                            <p className="text-sm font-bold text-muted-foreground animate-pulse">BUSCANDO DADOS REAIS...</p>
                        </div>
                    ) : campaignData ? (
                        <div className="space-y-6">
                            <div className="bg-[#1C1C1C] rounded-2xl p-6 shadow-xl border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <Badge variant="neon" className="font-black">WHATSAPP PREVIEW</Badge>
                                    <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{getDateLabel()}</div>
                                </div>
                                <div className="text-sm text-[#FAFAFA] font-medium whitespace-pre-line leading-relaxed italic opacity-90">
                                    {buildReportMessage()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {metrics.filter(m => m.enabled).map((metric) => (
                                    <div key={metric.id} className="bg-muted border border-border rounded-2xl p-4 group hover:border-primary/50 transition-colors">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 leading-tight">
                                            {metric.id === 'balance' && campaignData?.accountInfo && !campaignData.accountInfo.is_prepay
                                                ? `SALDO DEVEDOR`
                                                : metric.label}
                                        </p>
                                        <p className="text-xl font-black text-foreground">
                                            {metric.id === 'balance'
                                                ? formatValue(calculateAvailableBalance(), metric.format)
                                                : formatValue(campaignData[metric.key], metric.format)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-muted rounded-2xl border border-dashed border-border text-muted-foreground">
                            <Layers className="h-10 w-10 mb-4 opacity-20" />
                            <p className="font-bold text-sm">Aguardando Seleção de Conta</p>
                            <p className="text-xs uppercase tracking-tighter mt-1 opacity-60">Selecione no menu superior</p>
                        </div>
                    )}
                </GlassCard>

                <Button
                    onClick={handleSendReport}
                    disabled={loading || !campaignData}
                    className="w-full h-14 text-lg shadow-lg shadow-primary/20"
                    variant="primary"
                >
                    <Send className="w-5 h-5 mr-3" />
                    {loading ? 'ENVIANDO…' : 'ENVIAR VIA WHATSAPP'}
                </Button>

                {result && (
                    <GlassCard className={cn(
                        "animate-in slide-in-from-bottom-4 border-2 transition-all",
                        result.success ? "border-primary/50 bg-primary/5" : "border-red-500/50 bg-red-100/50"
                    )}>
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                result.success ? "bg-primary text-primary-foreground" : "bg-red-500 text-white"
                            )}>
                                {result.success ? '✓' : '✗'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className={cn(
                                    "font-black tracking-tight",
                                    result.success ? 'text-black' : 'text-red-600'
                                )}>
                                    {result.success ? 'RELATÓRIO ENVIADO COM SUCESSO!' : 'FALHA NO ENVIO DO RELATÓRIO'}
                                </h3>
                                <p className="text-xs font-medium text-muted-foreground mt-1 mb-3">
                                    {result.success ? 'Relatório enviado com sucesso.' : result.error}
                                </p>
                                <details className="bg-black/5 rounded-lg p-2 text-[10px] text-muted-foreground font-mono">
                                    <summary className="cursor-pointer hover:text-black">Log da Operação</summary>
                                    <pre className="mt-2 whitespace-pre-wrap">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
