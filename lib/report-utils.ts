export function formatCurrency(value: number, currency: string = 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number) {
    return new Intl.NumberFormat('pt-BR').format(value);
}

export function getRangeLabel(range: string): string {
    const labels: Record<string, string> = {
        'today': 'Hoje',
        'yesterday': 'Ontem',
        'last_7d': 'Últimos 7 dias',
        'last_30d': 'Últimos 30 dias',
        'this_month': 'Este Mês',
        'last_month': 'Mês Passado',
        'maximum': 'Todo o Período'
    };
    return labels[range] || range;
}

export function generateReportText({
    accountName,
    metrics,
    currency,
    range = 'today',
    platform = 'WhatsApp',
    metricConfig,
    customMessage,
    isPrepay = true
}: {
    accountName: string,
    metrics: any,
    currency: string,
    range?: string,
    platform?: 'WhatsApp' | 'Google Chat' | 'Email',
    metricConfig?: Record<string, boolean>,
    customMessage?: string,
    isPrepay?: boolean
}) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

    const campaigns: any[] = metrics.campaigns || [];

    const campaignBlocks = campaigns
        .filter((c: any) => {
            const ins = c.insights || {};
            const convs = parseFloat(ins.conversations || '0');
            const clicks = parseFloat(ins.clicks || '0');
            const reach = parseFloat(ins.reach || '0');
            return convs > 0 || clicks > 0 || reach > 0;
        })
        .map((c: any) => {
            const ins = c.insights || {};
            const clicks = formatNumber(parseFloat(ins.clicks || '0'));
            const conversations = formatNumber(parseFloat(ins.conversations || '0'));
            const reach = formatNumber(parseFloat(ins.reach || '0'));
            return `Segue as métricas: Meta ADS\n${c.name}\n\n🚀 Visitas ao perfil: ${clicks}\n🎯 Iniciaram Conversa: ${conversations}\n📊 Alcance da Campanha: ${reach}`;
        })
        .join('\n\n');

    const closing = customMessage ||
        'Estamos satisfeitos em ver esses números e continuaremos otimizando para garantir o melhor retorno possível. Caso tenham alguma dúvida ou queiram discutir mais a fundo esses resultados, estou à disposição.';

    return `🚀 Resultados ${accountName} do dia ${dateStr} 🚀

Bom dia, espero que todos estejam bem 🙏🏻
Segue mais um dia de otimização diária das nossas campanhas para trazer o melhor resultado.

${campaignBlocks}

${closing}`;
}

export function generateEmailHtml({
    accountName,
    metrics,
    currency,
    range = 'today',
    metricConfig,
    customMessage,
    isPrepay = true,
}: {
    accountName: string;
    metrics: any;
    currency: string;
    range?: string;
    metricConfig?: Record<string, boolean>;
    customMessage?: string;
    isPrepay?: boolean;
}): string {
    const today = new Date().toLocaleDateString('pt-BR');
    const rangeLabel = getRangeLabel(range);

    const show = (id: string) => !metricConfig || metricConfig[id] !== false;

    const cpl = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;
    const cpcv = metrics.conversations > 0 ? metrics.spend / metrics.conversations : 0;
    const balance = metrics.balance !== undefined ? metrics.balance : 0;

    // ---- Highlight cards (up to 3, only enabled metrics) ----
    type HighlightCard = { label: string; value: string };
    const highlights: HighlightCard[] = [];
    if (show('spend'))   highlights.push({ label: 'Investimento', value: formatCurrency(metrics.spend, currency) });
    if (show('reach'))   highlights.push({ label: 'Alcance', value: formatNumber(metrics.reach || 0) });
    if (show('leads'))   highlights.push({ label: 'Leads', value: String(metrics.leads) });
    if (highlights.length === 0 && show('impressions')) highlights.push({ label: 'Impressões', value: formatNumber(metrics.impressions) });
    const topCards = highlights.slice(0, 3);

    // ---- Detail rows ----
    type MetricRow = { icon: string; label: string; value: string; highlight?: boolean };
    const rows: MetricRow[] = [];
    if (show('spend'))            rows.push({ icon: '💰', label: 'Investimento Total', value: formatCurrency(metrics.spend, currency) });
    if (show('impressions'))      rows.push({ icon: '👥', label: 'Impressões', value: formatNumber(metrics.impressions) });
    if (show('reach'))            rows.push({ icon: '👁️', label: 'Alcance', value: formatNumber(metrics.reach || 0) });
    if (show('clicks'))           rows.push({ icon: '👆', label: 'Cliques no Anúncio', value: formatNumber(metrics.clicks) });
    if (show('cpc'))              rows.push({ icon: '📉', label: 'CPC Médio', value: formatCurrency(parseFloat(metrics.cpc || 0), currency) });
    if (show('ctr'))              rows.push({ icon: '📈', label: 'CTR (Taxa de Cliques)', value: `${metrics.ctr}%` });
    if (show('cpm'))              rows.push({ icon: '📊', label: 'CPM Médio', value: formatCurrency(parseFloat(metrics.cpm || '0'), currency) });
    if (show('leads'))            rows.push({ icon: '🎯', label: 'Leads / Conversões', value: formatNumber(metrics.leads) });
    if (show('leads') && cpl > 0) rows.push({ icon: '💵', label: 'Custo por Lead', value: formatCurrency(cpl, currency) });
    if (show('leads_form') && (metrics.leads_form || 0) > 0) rows.push({ icon: '📋', label: 'Leads Formulário', value: formatNumber(metrics.leads_form || 0), highlight: true });
    if (show('leads_gtm')  && (metrics.leads_gtm  || 0) > 0) rows.push({ icon: '🎯', label: 'Leads GTM/Pixel', value: formatNumber(metrics.leads_gtm  || 0) });
    if (show('sales')      && (metrics.sales       || 0) > 0) rows.push({ icon: '🛒', label: 'Vendas', value: formatNumber(metrics.sales || 0) });
    if (show('leads') && metrics.conversations > 0) rows.push({ icon: '💬', label: 'Conversas Iniciadas', value: formatNumber(metrics.conversations) });
    if (show('leads') && cpcv > 0)                  rows.push({ icon: '💸', label: 'Custo por Conversa', value: formatCurrency(cpcv, currency) });
    if (show('post_engagements') && (metrics.post_engagements || 0) > 0) rows.push({ icon: '❤️', label: 'Engajamentos', value: formatNumber(metrics.post_engagements || 0) });
    if (show('comments')   && (metrics.comments    || 0) > 0) rows.push({ icon: '💬', label: 'Comentários', value: formatNumber(metrics.comments || 0) });
    if (show('page_likes') && (metrics.page_likes  || 0) > 0) rows.push({ icon: '👥', label: 'Novos Seguidores', value: formatNumber(metrics.page_likes || 0) });
    if (show('video_views') && (metrics.video_views || 0) > 0) rows.push({ icon: '▶️', label: 'Views de Vídeo', value: formatNumber(metrics.video_views || 0) });
    if (isPrepay && show('balance')) rows.push({ icon: '💳', label: 'Saldo Disponível', value: formatCurrency(balance, currency), highlight: true });

    const cardWidth = topCards.length === 1 ? '60%' : topCards.length === 2 ? '45%' : '30%';

    const cardHtml = topCards.map(c => `
        <td style="width:${cardWidth};padding:20px 10px;background-color:#fcfdfe;border:1px solid #f0f4f7;border-radius:20px;text-align:center;border-bottom:3px solid #FF5A1F;vertical-align:top;">
            <div style="font-size:22px;color:#2d3436;font-weight:800;margin-bottom:4px;">${c.value}</div>
            <div style="font-size:10px;color:#95a5a6;text-transform:uppercase;font-weight:700;letter-spacing:1.2px;">${c.label}</div>
        </td>
        <td style="width:5px;"></td>`
    ).join('');

    const rowHtml = rows.map((r, i) => {
        const isLast = i === rows.length - 1;
        const valColor = r.highlight ? '#FF5A1F' : '#2d3436';
        const border = isLast ? '' : 'border-bottom:1px solid #f1f3f5;';
        return `
        <tr>
            <td style="padding:14px 0;${border}">
                <span style="font-size:13px;color:#636e72;font-weight:500;">${r.icon} ${r.label}</span>
            </td>
            <td style="padding:14px 0;${border};text-align:right;">
                <span style="font-size:14px;color:${valColor};font-weight:700;">${r.value}</span>
            </td>
        </tr>`;
    }).join('');

    const customMsgHtml = customMessage ? `
        <div style="margin-top:30px;padding:20px 25px;background-color:#fff8f5;border-left:4px solid #FF5A1F;border-radius:0 12px 12px 0;">
            <p style="margin:0;font-size:14px;color:#2d3436;line-height:1.6;">${customMessage}</p>
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Relatório Diário – ${accountName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:30px 10px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:32px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.06);border:1px solid #e1e8e8;">

      <!-- Logo -->
      <tr><td align="center" style="padding:40px 30px 20px;">
        <img src="https://grupodpg.com.br/wp-content/uploads/2026/03/Logo-DPG-Png-Marketing-Contabil.png" alt="DPG Digital" style="max-width:200px;height:auto;display:block;margin:0 auto;">
      </td></tr>

      <!-- Header -->
      <tr><td align="center" style="padding:0 40px 30px;">
        <h2 style="margin:0;font-size:24px;font-weight:800;color:#2d3436;letter-spacing:-0.5px;">📊 Relatório Diário</h2>
        <div style="width:40px;height:4px;background-color:#FF5A1F;margin:12px auto;border-radius:2px;"></div>
        <p style="margin:0;font-size:12px;color:#7f8c8d;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
            ${accountName} &nbsp;•&nbsp; ${rangeLabel} &nbsp;•&nbsp; ${today}
        </p>
      </td></tr>

      <!-- Highlight Cards -->
      ${topCards.length > 0 ? `
      <tr><td style="padding:0 30px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>${cardHtml}</tr>
        </table>
      </td></tr>` : ''}

      <!-- Detail Table -->
      ${rows.length > 0 ? `
      <tr><td style="padding:0 40px 10px;">
        <div style="background-color:#fcfdfe;border:1px solid #f0f4f7;border-radius:24px;padding:30px 25px;">
            <h3 style="margin:0 0 20px;font-size:16px;font-weight:800;color:#2d3436;">Detalhamento das Campanhas</h3>
            <table width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
        </div>
      </td></tr>` : ''}

      <!-- Custom Message -->
      ${customMsgHtml ? `<tr><td style="padding:0 40px 10px;">${customMsgHtml}</td></tr>` : ''}

      <!-- Footer -->
      <tr><td align="center" style="padding:30px 40px 40px;border-top:1px solid #f1f3f5;margin-top:20px;">
        <strong style="color:#2d3436;font-size:14px;display:block;margin-bottom:4px;">Grupo DPG Digital</strong>
        <a href="https://www.dpgdigital.com" style="color:#FF5A1F;text-decoration:none;font-size:12px;font-weight:700;">www.dpgdigital.com</a>
        <p style="font-size:10px;color:#b2bec3;margin:14px 0 0;line-height:1.6;">
            Relatório automático de performance • © ${new Date().getFullYear()}<br>
            Direcionado ao cliente do Grupo DPG.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
