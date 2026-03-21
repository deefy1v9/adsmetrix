import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, MousePointerClick, MessageSquare, Wallet } from "lucide-react";
import { DateRangePreset } from "@/components/providers/DateContext";

import { calculateAvailableBalance, getPaymentLabel } from "@/lib/balance-utils";

interface KPICardsProps {
    spend: number;
    clicks: number;
    conversions: number;
    conversations: number;
    costPerConversion: number;
    costPerConversation: number;
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

export function KPICards({
    spend,
    clicks,
    conversions,
    conversations,
    costPerConversion,
    costPerConversation,
    accountBalance,
    isPrepay,
    fundingSourceDetails,
    spendCap,
    amountSpent,
    preset = "last_30d"
}: KPICardsProps) {
    const displayBalance = calculateAvailableBalance({
        is_prepay_account: isPrepay,
        funding_source_details: fundingSourceDetails,
        spend_cap: spendCap,
        balance: accountBalance,
        amount_spent: amountSpent
    } as any);

    let paymentLabel = getPaymentLabel({ is_prepay_account: isPrepay });

    if (!isPrepay && fundingSourceDetails?.display_string) {
        paymentLabel = fundingSourceDetails.display_string; // e.g. "Visa ... 1234"
    }

    const getComparisonLabel = () => {
        switch (preset) {
            case "today":
            case "yesterday":
                return "vs. ontem";
            case "last_7d":
                return "vs. semana passada";
            case "last_30d":
            case "this_month":
            case "last_month":
                return "vs. mês passado";
            default:
                return "vs. período anterior";
        }
    };

    const comparisonLabel = getComparisonLabel();

    const hasConversions = conversions > 0;
    const hasConversations = conversations > 0;

    const allStats = [
        {
            title: isPrepay ? "Saldo Disponível" : "Saldo Disponível (Saldo a ser cobrado no cartão)",
            value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(displayBalance),
            change: paymentLabel,
            trend: "neutral",
            icon: Wallet,
            show: true,
        },
        {
            title: "Gasto Total",
            value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(spend),
            change: "+12%",
            trend: "up",
            icon: DollarSign,
            show: true,
        },
        {
            title: "Cliques",
            value: clicks.toLocaleString(),
            change: "+4%",
            trend: "up",
            icon: MousePointerClick,
            show: true,
        },
        {
            title: "Custo por Result.",
            value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(costPerConversion),
            change: "-2%",
            trend: "down",
            icon: Users,
            show: hasConversions,
        },
        {
            title: "Conversões",
            value: conversions.toString(),
            change: "+8%",
            trend: "up",
            icon: MessageSquare,
            show: hasConversions,
        },
        {
            title: "Conversas",
            value: conversations.toString(),
            change: "+15%",
            trend: "up",
            icon: Users,
            show: hasConversations,
        },
        {
            title: "Custo/Conversa",
            value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(costPerConversation),
            change: "-5%",
            trend: "down",
            icon: DollarSign,
            show: hasConversations,
        },
    ];

    const stats = allStats.filter(s => s.show);

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat, index) => (
                <GlassCard key={index} className="flex flex-col justify-between hoverEffect">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                            <div className="p-2 bg-muted rounded-full border border-border">
                                <stat.icon className="h-4 w-4 text-foreground" />
                            </div>
                        </div>

                        <div>
                            <div className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</div>
                            {stat.title.includes("Saldo Disponível") && spendCap && spendCap > 0 && (
                                <div className="mt-2">
                                    <Badge variant="warning" className="text-[9px] px-1.5 font-bold">
                                        Limite: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(spendCap / 100)}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2">
                        {stat.trend !== "neutral" ? (
                            <div className="flex items-center gap-2">
                                <Badge variant="neon" className="flex items-center">
                                    {stat.trend === "up" ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                                    {stat.change}
                                </Badge>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{comparisonLabel}</span>
                            </div>
                        ) : (
                            <Badge variant="neutral">{stat.change}</Badge>
                        )}
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
