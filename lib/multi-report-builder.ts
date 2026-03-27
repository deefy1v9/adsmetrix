import { MetaCampaign } from './meta-api';

export interface MultiReportMetrics {
    spend?: boolean;
    leads?: boolean;
    clicks?: boolean;
    conversations?: boolean;
    cost_per_conversation?: boolean;
    purchases?: boolean;
    purchase_value?: boolean;
    cost_per_purchase?: boolean;
    roas?: boolean;
    reach?: boolean;
    instagram_profile_visits?: boolean;
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
    purchases: false,
    purchase_value: false,
    cost_per_purchase: false,
    roas: false,
    reach: true,
    instagram_profile_visits: false,
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
    purchases: 'Compras',
    purchase_value: 'Valor de Vendas',
    cost_per_purchase: 'Custo por Compra',
    roas: 'ROAS',
    reach: 'Alcance',
    instagram_profile_visits: 'Visitas ao Perfil',
    followers: 'Seguidores Novos',
    cost_per_follower: 'Custo por Seguidor',
    ctr: 'CTR',
    cpc: 'CPC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | number | undefined, type: 'currency' | 'number' | 'percent' | 'ratio'): string {
    const n = parseFloat(String(value ?? '0'));
    if (isNaN(n)) return '—';
    if (type === 'currency') return `R$ ${n.toFixed(2).replace('.', ',')}`;
    if (type === 'percent')  return `${n.toFixed(2)}%`;
    if (type === 'ratio')    return n.toFixed(2).replace('.', ',');
    return n.toLocaleString('pt-BR');
}

function costPer(spend: string | undefined, count: string | undefined): string {
    const s = parseFloat(spend ?? '0');
    const c = parseInt(count ?? '0');
    if (!c || !s) return '—';
    return `R$ ${(s / c).toFixed(2).replace('.', ',')}`;
}

export function getDateLabel(preset: string): string {
    const tz  = 'America/Sao_Paulo';
    const now = new Date();
    const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' }).format(d);
    const shift = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); return d; };

    if (preset === 'today')      return fmt(now);
    if (preset === 'yesterday')  return fmt(shift(-1));
    if (preset === 'last_3d')    return `${fmt(shift(-3))} a ${fmt(shift(-1))}`;
    if (preset === 'last_7d')    return `${fmt(shift(-7))} a ${fmt(shift(-1))}`;
    if (preset === 'last_30d')   return `${fmt(shift(-30))} a ${fmt(shift(-1))}`;
    if (preset === 'this_month') return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, month: 'long', year: 'numeric' }).format(now);
    if (preset === 'last_month') {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, month: 'long', year: 'numeric' }).format(d);
    }
    if (preset === 'maximum') return 'Todo o período';
    return preset;
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildMultiAccountReport(
    accountsData: { accountName: string; campaigns: MetaCampaign[] }[],
    metricsConfig: MultiReportMetrics,
    datePreset: string,
    customMessage?: string,
    campaignMetrics?: Record<string, Record<string, boolean>>,
): string {
    const m = metricsConfig;
    const dateLabel = getDateLabel(datePreset);
    const lines: string[] = [];

    lines.push(`📅 *${dateLabel}*`);
    lines.push('');

    if (customMessage) {
        lines.push(customMessage);
        lines.push('');
    }


    let totalSpend = 0, totalLeads = 0, totalClicks = 0;
    let totalConversations = 0, totalPurchases = 0, totalPurchaseValue = 0;
    let totalReach = 0, totalProfileVisits = 0, totalFollowers = 0;

    for (const { accountName, campaigns } of accountsData) {
        const activeCampaigns = campaigns.filter(c =>
            c.insights && parseFloat(c.insights.spend ?? '0') > 0
        );
        if (activeCampaigns.length === 0) continue;

        lines.push(`*${accountName}*`);
        lines.push('');

        for (const campaign of activeCampaigns) {
            const ins = campaign.insights;
            // Per-campaign metrics override; falls back to global config
            const cm: MultiReportMetrics = (campaignMetrics?.[campaign.id])
                ? campaignMetrics[campaign.id] as MultiReportMetrics
                : m;
            // helpers to check if a numeric field has a real value
            const hasN = (v?: string) => parseInt(v ?? '0') > 0;
            const hasF = (v?: string) => parseFloat(v ?? '0') > 0;

            lines.push(`▸ ${campaign.name}`);
            // Always show spend (every active campaign has it)
            if (cm.spend)   lines.push(`   💸 Investimento: ${fmt(ins?.spend, 'currency')}`);
            if (cm.reach)   lines.push(`   📊 Alcance: ${fmt(ins?.reach, 'number')}`);
            if (cm.clicks && hasN(ins?.clicks))  lines.push(`   🖱️ Cliques: ${fmt(ins?.clicks, 'number')}`);
            // Leads / conversations — only if the campaign generated them
            if (cm.leads          && hasN(ins?.leads))         lines.push(`   🎯 Leads: ${fmt(ins?.leads, 'number')}`);
            if (cm.conversations  && hasN(ins?.conversations))  lines.push(`   💬 Conversas: ${fmt(ins?.conversations, 'number')}`);
            if (cm.cost_per_conversation && hasN(ins?.conversations)) lines.push(`   💸 Custo por Conversa: ${costPer(ins?.spend, ins?.conversations)}`);
            // Purchase metrics — only if the campaign has purchases
            if (cm.purchases      && hasN(ins?.sales))          lines.push(`   ✅ Compras: ${fmt(ins?.sales, 'number')}`);
            if (cm.purchase_value && hasF(ins?.purchase_value)) lines.push(`   🚀 Valor de Vendas: ${fmt(ins?.purchase_value, 'currency')}`);
            if (cm.cost_per_purchase && hasN(ins?.sales))       lines.push(`   💸 Custo por Compra: ${costPer(ins?.spend, ins?.sales)}`);
            if (cm.roas           && hasF(ins?.roas))           lines.push(`   🎯 ROAS: ${fmt(ins?.roas, 'ratio')}`);
            // Instagram metrics — only if generated
            if (cm.instagram_profile_visits && hasN(ins?.instagram_profile_visits)) lines.push(`   ↗️ Visitas ao Perfil: ${fmt(ins?.instagram_profile_visits, 'number')}`);
            if (cm.followers      && hasN(ins?.page_likes))     lines.push(`   📱 Seguidores Novos: ${fmt(ins?.page_likes, 'number')}`);
            if (cm.cost_per_follower && hasN(ins?.page_likes))  lines.push(`   💸 Custo por Seguidor: ${costPer(ins?.spend, ins?.page_likes)}`);
            if (cm.ctr && hasF(ins?.ctr))  lines.push(`   📈 CTR: ${fmt(ins?.ctr, 'percent')}`);
            if (cm.cpc && hasF(ins?.cpc))  lines.push(`   💵 CPC: ${fmt(ins?.cpc, 'currency')}`);
            lines.push('');

            totalSpend         += parseFloat(ins?.spend ?? '0');
            totalLeads         += parseInt(ins?.leads ?? '0');
            totalClicks        += parseInt(ins?.clicks ?? '0');
            totalConversations += parseInt(ins?.conversations ?? '0');
            totalPurchases     += parseInt(ins?.sales ?? '0');
            totalPurchaseValue += parseFloat(ins?.purchase_value ?? '0');
            totalReach         += parseInt(ins?.reach ?? '0');
            totalProfileVisits += parseInt(ins?.instagram_profile_visits ?? '0');
            totalFollowers     += parseInt(ins?.page_likes ?? '0');
        }
    }

    lines.push('━━━━━━━━━━━━━━━━');
    lines.push(`📊 *TOTAIS COMBINADOS*`);
    if (m.spend)                   lines.push(`💸 Investimento: ${fmt(totalSpend, 'currency')}`);
    if (m.reach)                   lines.push(`📊 Alcance: ${totalReach.toLocaleString('pt-BR')}`);
    if (m.leads)                   lines.push(`🎯 Leads: ${totalLeads.toLocaleString('pt-BR')}`);
    if (m.clicks)                  lines.push(`🖱️ Cliques: ${totalClicks.toLocaleString('pt-BR')}`);
    if (m.conversations)           lines.push(`💬 Conversas: ${totalConversations.toLocaleString('pt-BR')}`);
    if (m.cost_per_conversation)   lines.push(`💸 Custo por Conversa: ${costPer(totalSpend.toString(), totalConversations.toString())}`);
    if (m.purchases)               lines.push(`✅ Compras: ${totalPurchases.toLocaleString('pt-BR')}`);
    if (m.purchase_value)          lines.push(`🚀 Valor de Vendas: ${fmt(totalPurchaseValue, 'currency')}`);
    if (m.cost_per_purchase)       lines.push(`💸 Custo por Compra: ${costPer(totalSpend.toString(), totalPurchases.toString())}`);
    if (m.roas && totalSpend > 0)  lines.push(`🎯 ROAS: ${(totalPurchaseValue / totalSpend).toFixed(2).replace('.', ',')}`);
    if (m.instagram_profile_visits) lines.push(`↗️ Visitas ao Perfil: ${totalProfileVisits.toLocaleString('pt-BR')}`);
    if (m.followers)               lines.push(`📱 Seguidores Novos: ${totalFollowers.toLocaleString('pt-BR')}`);
    if (m.cost_per_follower)       lines.push(`💸 Custo por Seguidor: ${costPer(totalSpend.toString(), totalFollowers.toString())}`);

    return lines.join('\n');
}
