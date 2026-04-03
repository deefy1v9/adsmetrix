/**
 * Dashboard KPI metrics — definitions, labels, groups, and defaults.
 * Stored as dashboard_metrics_config (Json) on the Setting model.
 */

export type DashboardMetricKey =
    | 'spend'
    | 'clicks'
    | 'reach'
    | 'impressions'
    | 'ctr'
    | 'cpc'
    | 'purchases'
    | 'purchase_value'
    | 'cost_per_purchase'
    | 'roas'
    | 'initiate_checkout'
    | 'cost_per_checkout'
    | 'add_to_cart'
    | 'view_content'
    | 'complete_registration'
    | 'add_payment_info'
    | 'leads'
    | 'cost_per_lead'
    | 'conversations'
    | 'cost_per_conversation';

export interface DashboardMetricDef {
    key: DashboardMetricKey;
    label: string;
    group: 'Desempenho' | 'Pixel / Compras' | 'Leads' | 'Conversas';
    format: 'currency' | 'number' | 'percent' | 'ratio';
    description?: string;
}

export const DASHBOARD_METRIC_DEFS: DashboardMetricDef[] = [
    // Desempenho
    { key: 'spend',          label: 'Gasto Total',          group: 'Desempenho',      format: 'currency' },
    { key: 'clicks',         label: 'Cliques',              group: 'Desempenho',      format: 'number' },
    { key: 'reach',          label: 'Alcance',              group: 'Desempenho',      format: 'number' },
    { key: 'impressions',    label: 'Impressões',           group: 'Desempenho',      format: 'number' },
    { key: 'ctr',            label: 'CTR',                  group: 'Desempenho',      format: 'percent' },
    { key: 'cpc',            label: 'CPC',                  group: 'Desempenho',      format: 'currency' },
    // Pixel / Compras
    { key: 'purchases',           label: 'Compras',                  group: 'Pixel / Compras', format: 'number',   description: 'omni_purchase / purchase' },
    { key: 'purchase_value',      label: 'Valor das Compras',        group: 'Pixel / Compras', format: 'currency' },
    { key: 'cost_per_purchase',   label: 'Custo por Compra',         group: 'Pixel / Compras', format: 'currency' },
    { key: 'roas',                label: 'ROAS',                     group: 'Pixel / Compras', format: 'ratio' },
    { key: 'initiate_checkout',   label: 'Iniciar Checkout',         group: 'Pixel / Compras', format: 'number',   description: 'omni_initiated_checkout' },
    { key: 'cost_per_checkout',   label: 'Custo por Checkout',       group: 'Pixel / Compras', format: 'currency' },
    { key: 'add_to_cart',         label: 'Adicionar ao Carrinho',    group: 'Pixel / Compras', format: 'number',   description: 'omni_add_to_cart' },
    { key: 'view_content',        label: 'Visualizações de Conteúdo',group: 'Pixel / Compras', format: 'number',   description: 'omni_view_content' },
    { key: 'complete_registration',label: 'Cadastros Completos',     group: 'Pixel / Compras', format: 'number',   description: 'omni_complete_registration' },
    { key: 'add_payment_info',    label: 'Info de Pagamento',        group: 'Pixel / Compras', format: 'number',   description: 'omni_add_payment_info' },
    // Leads
    { key: 'leads',          label: 'Leads (Total)',        group: 'Leads',           format: 'number' },
    { key: 'cost_per_lead',  label: 'Custo por Lead',       group: 'Leads',           format: 'currency' },
    // Conversas
    { key: 'conversations',         label: 'Conversas Iniciadas',  group: 'Conversas', format: 'number' },
    { key: 'cost_per_conversation', label: 'Custo por Conversa',   group: 'Conversas', format: 'currency' },
];

export const DEFAULT_DASHBOARD_METRICS: Record<DashboardMetricKey, boolean> = {
    spend:                  true,
    clicks:                 true,
    reach:                  false,
    impressions:            false,
    ctr:                    false,
    cpc:                    false,
    purchases:              false,
    purchase_value:         false,
    cost_per_purchase:      false,
    roas:                   false,
    initiate_checkout:      false,
    cost_per_checkout:      false,
    add_to_cart:            false,
    view_content:           false,
    complete_registration:  false,
    add_payment_info:       false,
    leads:                  false,
    cost_per_lead:          false,
    conversations:          true,
    cost_per_conversation:  true,
};
