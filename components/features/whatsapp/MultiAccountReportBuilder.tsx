'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAccount } from '@/components/providers/AccountContext';
import { useDate } from '@/components/providers/DateContext';
import {
    fetchCampaignsMultiAction,
    fetchAdSetsForCampaignAction,
    AccountCampaignsResult,
} from '@/actions/meta-actions';
import { sendTestMessageAction } from '@/actions/uazapi-actions';
import { MetaCampaign, MetaAdSet } from '@/lib/meta-api';
import { cn } from '@/lib/utils';
import {
    ChevronDown, ChevronRight, Loader2, Send,
    RefreshCw, CheckSquare, Square, Building2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnabledMetrics {
    spend: boolean;
    leads: boolean;
    clicks: boolean;
    conversations: boolean;
    ctr: boolean;
    cpc: boolean;
}

const DEFAULT_METRICS: EnabledMetrics = {
    spend: true,
    leads: true,
    clicks: true,
    conversations: false,
    ctr: false,
    cpc: false,
};

const METRIC_LABELS: Record<keyof EnabledMetrics, string> = {
    spend: 'Investimento',
    leads: 'Leads',
    clicks: 'Cliques',
    conversations: 'Conversas',
    ctr: 'CTR',
    cpc: 'CPC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | number | undefined, type: keyof EnabledMetrics): string {
    const n = parseFloat(String(value ?? '0'));
    if (isNaN(n)) return '—';
    if (type === 'spend' || type === 'cpc') return `R$ ${n.toFixed(2).replace('.', ',')}`;
    if (type === 'ctr') return `${n.toFixed(2)}%`;
    return n.toLocaleString('pt-BR');
}

function metricLines(c: MetaCampaign | MetaAdSet, metrics: EnabledMetrics, indent = '   '): string[] {
    const ins = c.insights;
    const lines: string[] = [];
    if (metrics.spend)         lines.push(`${indent}💰 Investimento: ${fmt(ins?.spend, 'spend')}`);
    if (metrics.leads)         lines.push(`${indent}🎯 Leads: ${fmt(ins?.leads, 'leads')}`);
    if (metrics.clicks)        lines.push(`${indent}🖱️ Cliques: ${fmt(ins?.clicks, 'clicks')}`);
    if (metrics.conversations) lines.push(`${indent}💬 Conversas: ${fmt(ins?.conversations, 'conversations')}`);
    if (metrics.ctr)           lines.push(`${indent}📈 CTR: ${fmt(ins?.ctr, 'ctr')}`);
    if (metrics.cpc)           lines.push(`${indent}💵 CPC: ${fmt(ins?.cpc, 'cpc')}`);
    return lines;
}

function getDateLabel(preset: string): string {
    const map: Record<string, string> = {
        today: 'Hoje',
        yesterday: 'Ontem',
        last_7d: 'Últimos 7 dias',
        last_30d: 'Últimos 30 dias',
        this_month: 'Este mês',
        last_month: 'Mês passado',
        maximum: 'Todo o período',
    };
    return map[preset] || preset;
}

// ── Checkbox row ──────────────────────────────────────────────────────────────

function CheckRow({
    label, checked, onChange, indent = false, dim = false,
    badge,
}: {
    label: string; checked: boolean; onChange: () => void;
    indent?: boolean; dim?: boolean; badge?: string;
}) {
    return (
        <button
            onClick={onChange}
            className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm',
                checked ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60 text-muted-foreground',
                indent && 'ml-6',
                dim && 'opacity-50',
            )}
        >
            {checked
                ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" />
                : <Square className="w-4 h-4 shrink-0" />}
            <span className="flex-1 truncate font-medium">{label}</span>
            {badge && <Badge variant="neutral" className="text-[9px] shrink-0">{badge}</Badge>}
        </button>
    );
}

// ── Campaign row with ad set drill-down ───────────────────────────────────────

function CampaignRow({
    accountId, campaign, datePreset, selectedCampaigns, setSelectedCampaigns,
    selectedAdSets, setSelectedAdSets, adSetsCache, setAdSetsCache, metrics,
}: {
    accountId: string;
    campaign: MetaCampaign;
    datePreset: string;
    selectedCampaigns: Set<string>;
    setSelectedCampaigns: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedAdSets: Set<string>;
    setSelectedAdSets: React.Dispatch<React.SetStateAction<Set<string>>>;
    adSetsCache: Record<string, MetaAdSet[]>;
    setAdSetsCache: React.Dispatch<React.SetStateAction<Record<string, MetaAdSet[]>>>;
    metrics: EnabledMetrics;
}) {
    const [expanded, setExpanded] = useState(false);
    const [loadingAdSets, setLoadingAdSets] = useState(false);
    const adsets = adSetsCache[campaign.id];

    const toggleCampaign = () => {
        setSelectedCampaigns(prev => {
            const next = new Set(prev);
            if (next.has(campaign.id)) next.delete(campaign.id);
            else next.add(campaign.id);
            return next;
        });
    };

    const toggleAdSet = (id: string) => {
        setSelectedAdSets(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleExpand = async () => {
        if (!expanded && !adsets) {
            setLoadingAdSets(true);
            const data = await fetchAdSetsForCampaignAction(accountId, campaign.id, datePreset);
            setAdSetsCache(prev => ({ ...prev, [campaign.id]: data }));
            setLoadingAdSets(false);
        }
        setExpanded(e => !e);
    };

    const ins = campaign.insights;
    const isChecked = selectedCampaigns.has(campaign.id);

    return (
        <div>
            <div className="flex items-center gap-1">
                <div className="flex-1">
                    <CheckRow
                        label={campaign.name}
                        checked={isChecked}
                        onChange={toggleCampaign}
                        badge={campaign.status === 'ACTIVE' ? 'ATIVA' : undefined}
                    />
                </div>
                <button
                    onClick={handleExpand}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground shrink-0"
                    title="Ver conjuntos de anúncios"
                >
                    {loadingAdSets
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : expanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
            </div>

            {isChecked && ins && (
                <p className="ml-10 text-[10px] text-muted-foreground pb-1">
                    {metricLines(campaign, metrics, '').join(' · ')}
                </p>
            )}

            {expanded && adsets && (
                <div className="ml-4 border-l border-border pl-2 mt-1 space-y-0.5">
                    {adsets.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-1">Nenhum conjunto encontrado.</p>
                    ) : adsets.map(adset => (
                        <div key={adset.id}>
                            <CheckRow
                                label={adset.name}
                                checked={selectedAdSets.has(adset.id)}
                                onChange={() => toggleAdSet(adset.id)}
                                badge={adset.status === 'ACTIVE' ? 'ATIVO' : undefined}
                                indent
                            />
                            {selectedAdSets.has(adset.id) && adset.insights && (
                                <p className="ml-14 text-[10px] text-muted-foreground pb-1">
                                    {metricLines(adset, metrics, '').join(' · ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MultiAccountReportBuilder() {
    const { accounts } = useAccount();
    const { preset: datePreset } = useDate();

    // Account selection
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

    // Loaded campaign data
    const [campaignsData, setCampaignsData] = useState<AccountCampaignsResult[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    // Campaign / ad set selections
    const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
    const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set());

    // Ad sets loaded on demand
    const [adSetsCache, setAdSetsCache] = useState<Record<string, MetaAdSet[]>>({});

    // Metrics toggles
    const [metrics, setMetrics] = useState<EnabledMetrics>(DEFAULT_METRICS);

    // Send state
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

    // ── Handlers ────────────────────────────────────────────────────────────

    const toggleAccount = (id: string) => {
        setSelectedAccountIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleMetric = (key: keyof EnabledMetrics) => {
        setMetrics(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const loadCampaigns = async () => {
        if (selectedAccountIds.size === 0) return;
        setLoadingCampaigns(true);
        setCampaignsData([]);
        setSelectedCampaigns(new Set());
        setSelectedAdSets(new Set());
        setAdSetsCache({});
        const data = await fetchCampaignsMultiAction([...selectedAccountIds], datePreset);
        setCampaignsData(data);
        // Auto-select all active campaigns
        const activeCampaignIds = data.flatMap(a =>
            a.campaigns.filter(c => c.status === 'ACTIVE').map(c => c.id)
        );
        setSelectedCampaigns(new Set(activeCampaignIds));
        setLoadingCampaigns(false);
    };

    // ── Report builder ───────────────────────────────────────────────────────

    const buildReport = (): string => {
        if (campaignsData.length === 0) return '';

        const dateLabel = getDateLabel(datePreset);
        const lines: string[] = [
            `📊 *Relatório Multi-Conta* (${dateLabel})`,
            '',
        ];

        // Totals accumulators
        let totalSpend = 0, totalLeads = 0, totalClicks = 0, totalConversations = 0;

        for (const { accountName, accountId, campaigns } of campaignsData) {
            const selectedForAccount = campaigns.filter(c => selectedCampaigns.has(c.id));
            if (selectedForAccount.length === 0) continue;

            lines.push(`*${accountName}*`);
            lines.push('');

            for (const campaign of selectedForAccount) {
                const campaignAdSets = adSetsCache[campaign.id] ?? [];
                const selectedAdSetsForCampaign = campaignAdSets.filter(a => selectedAdSets.has(a.id));

                if (selectedAdSetsForCampaign.length > 0) {
                    lines.push(`📣 *${campaign.name}*`);
                    lines.push('');
                    for (const adset of selectedAdSetsForCampaign) {
                        lines.push(`▸ ${adset.name}`);
                        lines.push(...metricLines(adset, metrics));
                        lines.push('');
                        totalSpend         += parseFloat(adset.insights?.spend ?? '0');
                        totalLeads         += parseInt(adset.insights?.leads ?? '0');
                        totalClicks        += parseInt(adset.insights?.clicks ?? '0');
                        totalConversations += parseInt(adset.insights?.conversations ?? '0');
                    }
                } else {
                    lines.push(`▸ ${campaign.name}`);
                    lines.push(...metricLines(campaign, metrics));
                    lines.push('');
                    totalSpend         += parseFloat(campaign.insights?.spend ?? '0');
                    totalLeads         += parseInt(campaign.insights?.leads ?? '0');
                    totalClicks        += parseInt(campaign.insights?.clicks ?? '0');
                    totalConversations += parseInt(campaign.insights?.conversations ?? '0');
                }
            }
        }

        // Totals section
        lines.push('━━━━━━━━━━━━━━━━');
        lines.push('📊 *TOTAIS COMBINADOS*');
        if (metrics.spend)         lines.push(`💰 Investimento: ${fmt(totalSpend, 'spend')}`);
        if (metrics.leads)         lines.push(`🎯 Leads: ${totalLeads.toLocaleString('pt-BR')}`);
        if (metrics.clicks)        lines.push(`🖱️ Cliques: ${totalClicks.toLocaleString('pt-BR')}`);
        if (metrics.conversations) lines.push(`💬 Conversas: ${totalConversations.toLocaleString('pt-BR')}`);

        return lines.join('\n');
    };

    const handleSend = async () => {
        const message = buildReport();
        if (!message) return;
        setSending(true);
        setSendResult(null);
        const res = await sendTestMessageAction(message);
        setSendResult(res);
        setSending(false);
    };

    const reportPreview = buildReport();
    const hasSelection = selectedCampaigns.size > 0 || selectedAdSets.size > 0;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* Left — Config */}
            <div className="space-y-6">
                {/* Step 1: Select accounts */}
                <GlassCard>
                    <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-black">1</span>
                        Selecionar Contas
                    </h3>
                    <div className="space-y-1">
                        {accounts.map(account => (
                            <CheckRow
                                key={account.id}
                                label={account.name}
                                checked={selectedAccountIds.has(account.id)}
                                onChange={() => toggleAccount(account.id)}
                            />
                        ))}
                        {accounts.length === 0 && (
                            <p className="text-sm text-muted-foreground px-3 py-2">Nenhuma conta disponível.</p>
                        )}
                    </div>
                    <Button
                        onClick={loadCampaigns}
                        disabled={selectedAccountIds.size === 0 || loadingCampaigns}
                        variant="primary"
                        className="w-full mt-4"
                    >
                        {loadingCampaigns
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando campanhas…</>
                            : <><RefreshCw className="w-4 h-4 mr-2" /> Carregar Campanhas</>}
                    </Button>
                </GlassCard>

                {/* Step 2: Select campaigns / ad sets */}
                {campaignsData.length > 0 && (
                    <GlassCard>
                        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-black">2</span>
                            Campanhas &amp; Conjuntos
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                (clique ▶ para ver conjuntos)
                            </span>
                        </h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                            {campaignsData.map(({ accountId, accountName, campaigns }) => (
                                <div key={accountId}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{accountName}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {campaigns.length === 0 ? (
                                            <p className="text-xs text-muted-foreground px-3 py-1">Nenhuma campanha encontrada.</p>
                                        ) : campaigns.map(campaign => (
                                            <CampaignRow
                                                key={campaign.id}
                                                accountId={accountId}
                                                campaign={campaign}
                                                datePreset={datePreset}
                                                selectedCampaigns={selectedCampaigns}
                                                setSelectedCampaigns={setSelectedCampaigns}
                                                selectedAdSets={selectedAdSets}
                                                setSelectedAdSets={setSelectedAdSets}
                                                adSetsCache={adSetsCache}
                                                setAdSetsCache={setAdSetsCache}
                                                metrics={metrics}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* Step 3: Metric toggles */}
                <GlassCard>
                    <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-black">3</span>
                        Métricas a Incluir
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(metrics) as (keyof EnabledMetrics)[]).map(key => (
                            <button
                                key={key}
                                onClick={() => toggleMetric(key)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                                    metrics[key]
                                        ? 'bg-primary/10 border-primary/30 text-foreground'
                                        : 'bg-muted border-border text-muted-foreground/50'
                                )}
                            >
                                {metrics[key]
                                    ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                    : <Square className="w-4 h-4 shrink-0" />}
                                {METRIC_LABELS[key]}
                            </button>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Right — Preview & Send */}
            <div className="space-y-6">
                <GlassCard className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/30" />
                    <h3 className="text-base font-bold text-foreground mb-4">Prévia do Relatório</h3>

                    {reportPreview ? (
                        <div className="bg-[#1C1C1C] rounded-2xl p-5 border border-white/5">
                            <Badge variant="neon" className="font-black mb-3">WHATSAPP PREVIEW</Badge>
                            <pre className="text-sm text-[#FAFAFA] font-medium whitespace-pre-wrap leading-relaxed opacity-90 font-sans">
                                {reportPreview}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-muted rounded-2xl border border-dashed border-border text-muted-foreground">
                            <Building2 className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-bold text-sm">Selecione contas e campanhas</p>
                            <p className="text-xs mt-1 opacity-60">A prévia aparecerá aqui</p>
                        </div>
                    )}
                </GlassCard>

                <Button
                    onClick={handleSend}
                    disabled={sending || !hasSelection || !reportPreview}
                    variant="primary"
                    className="w-full h-14 text-lg shadow-lg shadow-primary/20"
                >
                    <Send className="w-5 h-5 mr-3" />
                    {sending ? 'ENVIANDO…' : 'ENVIAR VIA WHATSAPP'}
                </Button>

                {sendResult && (
                    <GlassCard className={cn(
                        'animate-in slide-in-from-bottom-4 border-2',
                        sendResult.success ? 'border-primary/50 bg-primary/5' : 'border-red-500/50 bg-red-100/50'
                    )}>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black',
                                sendResult.success ? 'bg-primary text-black' : 'bg-red-500 text-white'
                            )}>
                                {sendResult.success ? '✓' : '✗'}
                            </div>
                            <div>
                                <p className={cn('font-black', sendResult.success ? 'text-foreground' : 'text-red-500')}>
                                    {sendResult.success ? 'Relatório enviado!' : 'Falha no envio'}
                                </p>
                                {!sendResult.success && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{sendResult.error}</p>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
