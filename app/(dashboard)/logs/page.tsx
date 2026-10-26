import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ScrollText, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

interface SearchParams {
    channel?: string;
}

async function getWorkspaceId(): Promise<string | undefined> {
    try {
        const h = await headers();
        return h.get("x-workspace-id") ?? undefined;
    } catch {
        return undefined;
    }
}

async function getReportLogsAction(channel?: string, limit = 200) {
    try {
        const workspaceId = await getWorkspaceId();
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
        const workspaceId = await getWorkspaceId();
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
            <MessageSquare className="w-3 h-3" /> WhatsApp
        </span>
    );
}

function StatusBadge({ status, errorMsg }: { status: string; errorMsg?: string }) {
    if (status === "success") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                <CheckCircle2 className="w-3 h-3" /> Sucesso
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 cursor-help"
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
            icon: MessageSquare,
            sent: stats.whatsapp.sent,
            errors: stats.whatsapp.errors,
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistema"
                title="Logs"
                icon={ScrollText}
                description="Histórico de todos os relatórios enviados via WhatsApp Business."
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {statCards.map((card) => (
                    <StatCard
                        key={card.label}
                        label={`${card.label} — hoje`}
                        icon={card.icon}
                        value={`${card.sent} enviados`}
                        hint={card.errors > 0
                            ? <span className="font-medium text-destructive">{card.errors} erro{card.errors > 1 ? "s" : ""}</span>
                            : "Nenhum erro hoje"}
                    />
                ))}
            </div>

            <div className="glass-card overflow-hidden rounded-xl">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <SectionTitle title="Disparos" description={`${logs.length} registro${logs.length === 1 ? "" : "s"}`} />
                    {/* Filter Tabs */}
                    <div className="inline-flex self-start rounded-lg border border-border bg-muted p-0.5 sm:self-auto">
                        {filterTabs.map((tab) => (
                            <Link
                                key={tab.value}
                                href={tab.value === "all" ? "/logs" : `/logs?channel=${tab.value}`}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    channel === tab.value
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {logs.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        Nenhum log encontrado.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-xs text-muted-foreground">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-medium">Horário</th>
                                    <th className="text-left px-4 py-2.5 font-medium">Conta</th>
                                    <th className="text-left px-4 py-2.5 font-medium">Canal</th>
                                    <th className="text-left px-4 py-2.5 font-medium">Período</th>
                                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular">
                                            {new Date(log.sent_at).toLocaleString("pt-BR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZone: "America/Sao_Paulo",
                                            })}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                                            {log.account_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ChannelBadge channel={log.channel} />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <RangeLabel range={log.range} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={log.status} errorMsg={log.error_msg} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
