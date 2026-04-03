import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, MousePointerClick, MessageSquare, Wallet, ShoppingCart, TrendingUp, Eye, CheckSquare, CreditCard, BarChart2 } from "lucide-react";
import { DateRangePreset } from "@/components/providers/DateContext";
import { calculateAvailableBalance, getPaymentLabel } from "@/lib/balance-utils";
import type { DashboardMetricKey } from "@/lib/dashboard-metrics-config";
import { DASHBOARD_METRIC_DEFS } from "@/lib/dashboard-metrics-config";
import { MetaCampaign } from "@/lib/balance-utils";

export interface DashboardStats {
    spend: number;
    clicks: number;
    reach: number;
    impressions: number;
    ctr: number;
    cpc: number;
    purchases: number;
    purchase_value: number;
    roas: number;
    initiate_checkout: number;
    add_to_cart: number;
    view_content: number;
    complete_registration: number;
    add_payment_info: number;
    leads: number;
    conversations: number;
}

interface KPICardsProps {
    stats: DashboardStats;
    metricsConfig: Record<DashboardMetricKey, boolean>;
    accountBalance?: number;
    isPrepay?: boolean;
    spendCap?: number;
    amountSpent?: number;
    preset?: DateRangePreset;
    fundingSourceDetails?: {
        display_string: string;
        type: string;
        amount?: string;
        currency?: string;
    };
}

function fmtCurrency(n: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function fmtNumber(n: number) {
    return n.toLocaleString("pt-BR");
}
function fmtPercent(n: number) {
    return `${n.toFixed(2)}%`;
}
function fmtRatio(n: number) {
    return n.toFixed(2).replace(".", ",");
}

const ICONS: Record<string, any> = {
    spend: DollarSign,
    clicks: MousePointerClick,
    reach: Users,
    impressions: BarChart2,
    ctr: TrendingUp,
    cpc: DollarSign,
    purchases: ShoppingCart,
    purchase_value: DollarSign,
    cost_per_purchase: DollarSign,
    roas: TrendingUp,
    initiate_checkout: CreditCard,
    cost_per_checkout: CreditCard,
    add_to_cart: ShoppingCart,
    view_content: Eye,
    complete_registration: CheckSquare,
    add_payment_info: CreditCard,
    leads: Users,
    cost_per_lead: DollarSign,
    conversations: MessageSquare,
    cost_per_conversation: MessageSquare,
};

export function computeStats(campaigns: MetaCampaign[]): DashboardStats {
    const sum = (field: keyof NonNullable<MetaCampaign['insights']>, parser = parseInt) =>
        campaigns.reduce((acc, c) => acc + parser(c.insights?.[field] as string || '0'), 0);

    const spend         = sum('spend', parseFloat);
    const purchases     = sum('sales');
    const purchaseValue = sum('purchase_value', parseFloat);
    const conversations = sum('conversations');
    const leads         = campaigns.reduce((acc, c) =>
        acc + parseInt(c.insights?.leads_form || '0') + parseInt(c.insights?.leads_gtm || '0'), 0);

    return {
        spend,
        clicks:               sum('clicks'),
        reach:                sum('reach'),
        impressions:          sum('impressions'),
        ctr:                  campaigns.length > 0
            ? campaigns.reduce((acc, c) => acc + parseFloat(c.insights?.ctr || '0'), 0) / campaigns.filter(c => parseFloat(c.insights?.ctr || '0') > 0).length || 0
            : 0,
        cpc:                  spend > 0 && sum('clicks') > 0 ? spend / sum('clicks') : 0,
        purchases,
        purchase_value:       purchaseValue,
        roas:                 spend > 0 ? purchaseValue / spend : 0,
        initiate_checkout:    sum('initiate_checkout'),
        add_to_cart:          sum('add_to_cart'),
        view_content:         sum('view_content'),
        complete_registration: sum('complete_registration'),
        add_payment_info:     sum('add_payment_info'),
        leads,
        conversations,
    };
}

export function KPICards({
    stats,
    metricsConfig,
    accountBalance,
    isPrepay,
    fundingSourceDetails,
    spendCap,
    amountSpent,
    preset = "last_30d",
}: KPICardsProps) {
    const displayBalance = calculateAvailableBalance({
        is_prepay_account: isPrepay,
        funding_source_details: fundingSourceDetails,
        spend_cap: spendCap,
        balance: accountBalance,
        amount_spent: amountSpent,
    } as any);

    let paymentLabel = getPaymentLabel({ is_prepay_account: isPrepay });
    if (!isPrepay && fundingSourceDetails?.display_string) {
        paymentLabel = fundingSourceDetails.display_string;
    }

    const comparisonLabel = (() => {
        switch (preset) {
            case "today": case "yesterday": return "vs. ontem";
            case "last_7d": return "vs. semana passada";
            case "last_30d": case "this_month": case "last_month": return "vs. mês passado";
            default: return "vs. período anterior";
        }
    })();

    // Always-visible balance card
    const balanceCard = {
        key: 'balance',
        label: isPrepay ? "Saldo Disponível" : "Saldo (a cobrar no cartão)",
        value: fmtCurrency(displayBalance),
        sub: paymentLabel,
        icon: Wallet,
        neutral: true,
    };

    // Dynamic metric cards from config
    const metricCards = DASHBOARD_METRIC_DEFS.filter(def => metricsConfig[def.key]).map(def => {
        const s = stats;
        let value = '—';
        let show = true;

        switch (def.key) {
            case 'spend':                value = fmtCurrency(s.spend); break;
            case 'clicks':               value = fmtNumber(s.clicks); show = s.clicks > 0; break;
            case 'reach':                value = fmtNumber(s.reach); show = s.reach > 0; break;
            case 'impressions':          value = fmtNumber(s.impressions); show = s.impressions > 0; break;
            case 'ctr':                  value = fmtPercent(s.ctr); show = s.ctr > 0; break;
            case 'cpc':                  value = fmtCurrency(s.cpc); show = s.clicks > 0; break;
            case 'purchases':            value = fmtNumber(s.purchases); show = s.purchases > 0; break;
            case 'purchase_value':       value = fmtCurrency(s.purchase_value); show = s.purchase_value > 0; break;
            case 'cost_per_purchase':    value = s.purchases > 0 ? fmtCurrency(s.spend / s.purchases) : '—'; show = s.purchases > 0; break;
            case 'roas':                 value = s.spend > 0 ? fmtRatio(s.roas) : '—'; show = s.purchase_value > 0; break;
            case 'initiate_checkout':    value = fmtNumber(s.initiate_checkout); show = s.initiate_checkout > 0; break;
            case 'cost_per_checkout':    value = s.initiate_checkout > 0 ? fmtCurrency(s.spend / s.initiate_checkout) : '—'; show = s.initiate_checkout > 0; break;
            case 'add_to_cart':          value = fmtNumber(s.add_to_cart); show = s.add_to_cart > 0; break;
            case 'view_content':         value = fmtNumber(s.view_content); show = s.view_content > 0; break;
            case 'complete_registration':value = fmtNumber(s.complete_registration); show = s.complete_registration > 0; break;
            case 'add_payment_info':     value = fmtNumber(s.add_payment_info); show = s.add_payment_info > 0; break;
            case 'leads':                value = fmtNumber(s.leads); show = s.leads > 0; break;
            case 'cost_per_lead':        value = s.leads > 0 ? fmtCurrency(s.spend / s.leads) : '—'; show = s.leads > 0; break;
            case 'conversations':        value = fmtNumber(s.conversations); show = s.conversations > 0; break;
            case 'cost_per_conversation':value = s.conversations > 0 ? fmtCurrency(s.spend / s.conversations) : '—'; show = s.conversations > 0; break;
        }

        return { key: def.key, label: def.label, value, show, icon: ICONS[def.key] ?? DollarSign, neutral: false };
    }).filter(c => c.show);

    const allCards = [balanceCard, ...metricCards];

    return (
        <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {allCards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <GlassCard key={card.key ?? i} className="flex flex-col justify-between hoverEffect">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                                <div className="p-2 bg-muted rounded-full border border-border">
                                    <Icon className="h-4 w-4 text-foreground" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">{card.value}</div>
                                {card.key === 'balance' && spendCap && spendCap > 0 && (
                                    <div className="mt-2">
                                        <Badge variant="warning" className="text-[9px] px-1.5 font-bold">
                                            Limite: {fmtCurrency(spendCap / 100)}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2">
                            {card.neutral ? (
                                <Badge variant="neutral">{(card as any).sub}</Badge>
                            ) : (
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{comparisonLabel}</span>
                            )}
                        </div>
                    </GlassCard>
                );
            })}
        </div>
    );
}
