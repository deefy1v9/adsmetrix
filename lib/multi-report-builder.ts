import { MetaCampaign } from './meta-api';

export interface MultiReportMetrics {
    spend?: boolean;
    leads?: boolean;
    clicks?: boolean;
    conversations?: boolean;
    cost_per_conversation?: boolean;
    reach?: boolean;
    followers?: boolean;
    cost_per_follower?: boolean;
    ctr?: boolean;
    cpc?: boolean;
}

export const DEFAULT_AUTOMATION_METRICS: MultiReportMetrics = {
    spend: true,
    leads: true,
    clicks: true,
    conversations: true,
    cost_per_conversation: true,
    reach: true,
    followers: false,
    cost_per_follower: false,
    ctr: false,
    cpc: false,
};

export const METRIC_LABELS: Record<keyof MultiReportMetrics, string> = {
    spend: 'Investimento',
    leads: 'Leads',
    clicks: 'Cliques',
    conversations: 'Conversas',
    cost_per_conversation: 'Custo por Conversa',
    reach: 'Alcance',
    followers: 'Seguidores Ganhos',
    cost_per_follower: 'Custo por Seguidor',
    ctr: 'CTR',
    cpc: 'CPC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | number | undefined, type: 'currency' | 'number' | 'percent'): string {
    const n = parseFloat(String(value ?? '0'));
    if (isNaN(n)) return '—';
    if (type === 'currency') return `R$ ${n.toFixed(2).replace('.', ',')}`;
    if (type === 'percent')  return `${n.toFixed(2)}%`;
    return n.toLocaleString('pt-BR');
}

function costPer(spend: string | undefined, count: string | undefined): string {
    const s = parseFloat(spend ?? '0');
    const c = parseInt(count ?? '0');
    if (!c || !s) return '—';
    return `R$ ${(s / c).toFixed(2).replace('.', ',')}`;
}

export function getDateLabel(preset: string): string {
    const map: Record<string, string> = {
        today:      'Hoje',
        yesterday:  'Ontem',
        last_7d:    'Últimos 7 dias',
        last_30d:   'Últimos 30 dias',
        this_month: 'Este mês',
        last_month: 'Mês passado',
        maximum:    'Todo o período',
    };
    return map[preset] || preset;
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildMultiAccountReport(
    accountsData: { accountName: string; campaigns: MetaCampaign[] }[],
    metricsConfig: MultiReportMetrics,
    datePreset: string,
    customMessage?: string,
): string {
    const m = metricsConfig;
    const dateLabel = getDateLabel(datePreset);
    const lines: string[] = [];

    if (customMessage) {
        lines.push(customMessage);
        lines.push('');
    }


    let totalSpend = 0, totalLeads = 0, totalClicks = 0;
    let totalConversations = 0, totalReach = 0, totalFollowers = 0;

    for (const { accountName, campaigns } of accountsData) {
        const activeCampaigns = campaigns.filter(c =>
            c.insights && parseFloat(c.insights.spend ?? '0') > 0
        );
        if (activeCampaigns.length === 0) continue;

        lines.push(`*${accountName}*`);
        lines.push('');

        for (const campaign of activeCampaigns) {
            const ins = campaign.insights;
            lines.push(`▸ ${campaign.name}`);
            if (m.spend)                 lines.push(`   💸 Investimento: ${fmt(ins?.spend, 'currency')}`);
            if (m.reach)                 lines.push(`   📊 Alcance: ${fmt(ins?.reach, 'number')}`);
            if (m.leads)                 lines.push(`   🎯 Leads: ${fmt(ins?.leads, 'number')}`);
            if (m.clicks)                lines.push(`   🖱️ Cliques: ${fmt(ins?.clicks, 'number')}`);
            if (m.conversations)         lines.push(`   🎯 Conversas: ${fmt(ins?.conversations, 'number')}`);
            if (m.cost_per_conversation) lines.push(`   💸 Custo por Conversa: ${costPer(ins?.spend, ins?.conversations)}`);
            if (m.followers)             lines.push(`   🎯 Seguidores Ganhos: ${fmt(ins?.page_likes, 'number')}`);
            if (m.cost_per_follower)     lines.push(`   💸 Custo por Seguidor: ${costPer(ins?.spend, ins?.page_likes)}`);
            if (m.ctr)                   lines.push(`   📈 CTR: ${fmt(ins?.ctr, 'percent')}`);
            if (m.cpc)                   lines.push(`   💵 CPC: ${fmt(ins?.cpc, 'currency')}`);
            lines.push('');

            totalSpend         += parseFloat(ins?.spend ?? '0');
            totalLeads         += parseInt(ins?.leads ?? '0');
            totalClicks        += parseInt(ins?.clicks ?? '0');
            totalConversations += parseInt(ins?.conversations ?? '0');
            totalReach         += parseInt(ins?.reach ?? '0');
            totalFollowers     += parseInt(ins?.page_likes ?? '0');
        }
    }

    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('📊 *TOTAIS COMBINADOS*');
    if (m.spend)                 lines.push(`💸 Investimento: ${fmt(totalSpend, 'currency')}`);
    if (m.reach)                 lines.push(`📊 Alcance: ${totalReach.toLocaleString('pt-BR')}`);
    if (m.leads)                 lines.push(`🎯 Leads: ${totalLeads.toLocaleString('pt-BR')}`);
    if (m.clicks)                lines.push(`🖱️ Cliques: ${totalClicks.toLocaleString('pt-BR')}`);
    if (m.conversations)         lines.push(`🎯 Conversas: ${totalConversations.toLocaleString('pt-BR')}`);
    if (m.cost_per_conversation) lines.push(`💸 Custo por Conversa: ${costPer(totalSpend.toString(), totalConversations.toString())}`);
    if (m.followers)             lines.push(`🎯 Seguidores Ganhos: ${totalFollowers.toLocaleString('pt-BR')}`);
    if (m.cost_per_follower)     lines.push(`💸 Custo por Seguidor: ${costPer(totalSpend.toString(), totalFollowers.toString())}`);

    return lines.join('\n');
}
