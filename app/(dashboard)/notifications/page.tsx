import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCircle2, ChevronRight, Info, Users, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

type Tone = "success" | "warning" | "error" | "info";

interface Notification {
    id: string;
    tone: Tone;
    title: string;
    description?: string | null;
    at: Date;
    href?: string;
}

const TONE: Record<Tone, { icon: React.ElementType; className: string }> = {
    success: { icon: CheckCircle2, className: "bg-success/10 text-success" },
    warning: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
    error: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
    info: { icon: Info, className: "bg-info/10 text-info" },
};

/** Builds the feed from what the platform actually recorded — no stored notification table yet. */
async function loadNotifications(workspaceId: string): Promise<Notification[]> {
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(now - 24 * 60 * 60 * 1000);

    const [failedReports, sentReports, recentLeads, google, grants] = await Promise.all([
        prisma.reportLog.findMany({
            where: { workspace_id: workspaceId, status: { not: "success" }, sent_at: { gte: since7d } },
            orderBy: { sent_at: "desc" },
            take: 30,
        }),
        prisma.reportLog.findMany({
            where: { workspace_id: workspaceId, status: "success", sent_at: { gte: since24h } },
            orderBy: { sent_at: "desc" },
            select: { sent_at: true },
        }),
        prisma.lead.groupBy({
            by: ["account_id"],
            where: { created_time: { gte: since24h }, account: { workspace_id: workspaceId } },
            _count: { _all: true },
            _max: { created_time: true },
        }),
        prisma.googleAdsConnection.findUnique({ where: { workspace_id: workspaceId }, select: { last_error: true, updated_at: true } }),
        prisma.oAuthGrant.findMany({
            where: { workspace_id: workspaceId, created_at: { gte: since7d } },
            include: { client: { select: { client_name: true } }, user: { select: { email: true } } },
            orderBy: { created_at: "desc" },
            take: 10,
        }),
    ]);

    const accountNames = new Map(
        (await prisma.account.findMany({
            where: { id: { in: recentLeads.map(l => l.account_id).filter((id): id is string => !!id) } },
            select: { id: true, account_name: true, client_name: true },
        })).map(a => [a.id, a.client_name || a.account_name]),
    );

    const items: Notification[] = [];

    for (const r of failedReports) {
        items.push({
            id: `report:${r.id}`,
            tone: "error",
            title: `Falha ao enviar relatório — ${r.account_name}`,
            description: r.error_msg ?? `Canal: ${r.channel}`,
            at: r.sent_at,
            href: "/logs",
        });
    }

    if (sentReports.length > 0) {
        items.push({
            id: "reports:sent",
            tone: "success",
            title: `${sentReports.length} relatório(s) enviado(s) nas últimas 24h`,
            description: "Envios automáticos concluídos com sucesso.",
            at: sentReports[0].sent_at,
            href: "/logs",
        });
    }

    for (const l of recentLeads) {
        const count = l._count._all;
        items.push({
            id: `leads:${l.account_id}`,
            tone: "info",
            title: `${count} novo${count > 1 ? "s" : ""} lead${count > 1 ? "s" : ""} — ${accountNames.get(l.account_id ?? "") ?? "conta sem nome"}`,
            description: "Capturados nas últimas 24 horas.",
            at: l._max.created_time ?? new Date(),
            href: "/leads",
        });
    }

    if (google?.last_error) {
        items.push({
            id: "google:error",
            tone: "warning",
            title: "Google Ads precisa de atenção",
            description: google.last_error,
            at: google.updated_at,
            href: "/google-ads",
        });
    }

    for (const g of grants) {
        items.push({
            id: `grant:${g.id}`,
            tone: g.revoked_at ? "info" : "success",
            title: g.revoked_at
                ? `Acesso do ${g.client.client_name || "cliente MCP"} revogado`
                : `${g.client.client_name || "Cliente MCP"} conectado via MCP`,
            description: `Autorizado por ${g.user.email}`,
            at: g.revoked_at ?? g.created_at,
            href: "/settings#claude",
        });
    }

    return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

function groupLabel(d: Date) {
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return "Últimos 7 dias";
}

export default async function NotificationsPage() {
    const h = await headers();
    const workspaceId = h.get("x-workspace-id");
    const items = workspaceId ? await loadNotifications(workspaceId) : [];

    const groups = new Map<string, Notification[]>();
    for (const item of items) {
        const label = groupLabel(item.at);
        groups.set(label, [...(groups.get(label) ?? []), item]);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistema"
                title="Notificações"
                icon={Bell}
                description="Falhas de envio, novos leads e mudanças nas integrações dos últimos 7 dias."
            />

            {items.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Tudo tranquilo por aqui"
                    description="Nenhum evento nos últimos 7 dias. Falhas de relatório, novos leads e alertas das integrações aparecem nesta página."
                />
            ) : (
                <div className="space-y-6">
                    {[...groups.entries()].map(([label, list]) => (
                        <section key={label}>
                            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
                            <ul className="glass-card divide-y divide-border overflow-hidden rounded-xl">
                                {list.map(n => {
                                    const { icon: Icon, className } = TONE[n.tone];
                                    const body = (
                                        <div className="flex items-start gap-3 p-4">
                                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", className)}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                                                    <time dateTime={n.at.toISOString()} className="shrink-0 text-xs text-muted-foreground">
                                                        {formatDistanceToNow(n.at, { addSuffix: true, locale: ptBR })}
                                                    </time>
                                                </div>
                                                {n.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.description}</p>}
                                            </div>
                                            {n.href && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/60" />}
                                        </div>
                                    );
                                    return (
                                        <li key={n.id}>
                                            {n.href ? <Link href={n.href} className="block transition-colors hover:bg-muted/40">{body}</Link> : body}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
