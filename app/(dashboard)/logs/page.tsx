import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScrollText, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

interface SearchParams {
    channel?: string;
}

function getWorkspaceId(): string | undefined {
    try {
        return headers().get("x-workspace-id") ?? undefined;
    } catch {
        return undefined;
    }
}

async function getReportLogsAction(channel?: string, limit = 200) {
    try {
        const workspaceId = getWorkspaceId();
        const where: any = {};
        if (workspaceId) where.workspace_id = workspaceId;
        if (channel && channel !== "all") where.channel = channel;

        const logs = await (prisma as any).reportLog.findMany({
            where,
            orderBy: { sent_at: "desc" },
            take: limit,
        });
        return logs as any[];
    } catch {
        return [];
    }
}

async function getTodayStats() {
    try {
        const workspaceId = getWorkspaceId();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const where: any = { sent_at: { gte: today } };
        if (workspaceId) where.workspace_id = workspaceId;

        const logs = await (prisma as any).reportLog.findMany({
            where,
        }) as any[];

        const stats = {
            whatsapp: { sent: 0, errors: 0 },
        };

        for (const log of logs) {
            if (log.channel === "whatsapp") {
                if (log.status === "success") stats.whatsapp.sent++;
                else stats.whatsapp.errors++;
            }
        }

        return stats;
    } catch {
        return {
            whatsapp: { sent: 0, errors: 0 },
        };
    }
}

function ChannelBadge({ channel }: { channel: string }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <MessageSquare className="w-3 h-3" /> WhatsApp
        </span>
    );
}

function StatusBadge({ status, errorMsg }: { status: string; errorMsg?: string }) {
    if (status === "success") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Sucesso
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 cursor-help"
            title={errorMsg || "Erro desconhecido"}
        >
            <XCircle className="w-3 h-3" /> Erro
        </span>
    );
}

function RangeLabel({ range }: { range?: string }) {
    const map: Record<string, string> = {
        today: "Hoje",
        yesterday: "Ontem",
        last_7d: "7 dias",
        last_30d: "30 dias",
        this_month: "Este mês",
        last_month: "Mês passado",
    };
    return <span>{map[range || ""] || range || "—"}</span>;
}

export default async function LogsPage({ searchParams }: { searchParams: SearchParams }) {
    const channel = searchParams.channel || "all";
    const [logs, stats] = await Promise.all([getReportLogsAction(channel), getTodayStats()]);

    const filterTabs = [
        { label: "Todos", value: "all" },
        { label: "WhatsApp", value: "whatsapp" },
    ];

    const statCards = [
        {
            label: "WhatsApp",
            icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
            sent: stats.whatsapp.sent,
            errors: stats.whatsapp.errors,
            color: "emerald",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <ScrollText className="w-7 h-7" />
                    Logs de Disparos
                </h1>
                <p className="text-muted-foreground">
                    Histórico de todos os relatórios enviados via WhatsApp Business.
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 max-w-xs">
                {statCards.map((card) => (
                    <GlassCard key={card.label}>
                        <div className="p-4 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-muted/50">{card.icon}</div>
                            <div>
                                <div className="text-sm text-muted-foreground">{card.label} — hoje</div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-lg font-bold text-foreground">{card.sent} enviados</span>
                                    {card.errors > 0 && (
                                        <span className="text-sm text-red-500 font-medium">{card.errors} erro{card.errors > 1 ? "s" : ""}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            <GlassCard>
                <div className="p-6">
                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {filterTabs.map((tab) => (
                            <Link
                                key={tab.value}
                                href={tab.value === "all" ? "/logs" : `/logs?channel=${tab.value}`}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    channel === tab.value
                                        ? "bg-primary text-black border-primary"
                                        : "text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>

                    {logs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            Nenhum log encontrado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground">
                                        <th className="text-left pb-3 pr-4 font-medium">Horário</th>
                                        <th className="text-left pb-3 pr-4 font-medium">Conta</th>
                                        <th className="text-left pb-3 pr-4 font-medium">Canal</th>
                                        <th className="text-left pb-3 pr-4 font-medium">Período</th>
                                        <th className="text-left pb-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                                                {new Date(log.sent_at).toLocaleString("pt-BR", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    timeZone: "America/Sao_Paulo",
                                                })}
                                            </td>
                                            <td className="py-3 pr-4 font-medium text-foreground max-w-[180px] truncate">
                                                {log.account_name}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <ChannelBadge channel={log.channel} />
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground">
                                                <RangeLabel range={log.range} />
                                            </td>
                                            <td className="py-3">
                                                <StatusBadge status={log.status} errorMsg={log.error_msg} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
