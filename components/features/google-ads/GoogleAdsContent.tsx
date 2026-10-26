"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle, ArrowDown, ArrowUp, BarChart3, Check, ChevronDown, CircleDollarSign, Eye,
    Loader2, LogOut, MousePointerClick, Percent, RefreshCw, Search, Target, TrendingUp, Wallet, X,
} from "lucide-react";
import { useDate } from "@/components/providers/DateContext";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { GoogleAdsIcon } from "@/components/ui/PlatformIcons";
import { AreaChart, Area, Grid, XAxis, YAxis, ChartTooltip } from "@/components/ui/area-chart";
import { cn } from "@/lib/utils";
import {
    getGoogleAdsStatusAction,
    syncGoogleAdsAccountsAction,
    disconnectGoogleAdsAction,
    fetchGoogleAdsReportAction,
    setGoogleAdsCampaignStatusAction,
    type GoogleAdsStatus,
    type GoogleAdsReport,
    type GoogleAdsAccountView,
} from "@/actions/google-ads-actions";
import type { GoogleAdsCampaignRow } from "@/lib/google-ads";

const STORAGE_KEY = "selectedGoogleAdsCustomerId";

const CHANNEL_LABELS: Record<string, string> = {
    SEARCH: "Pesquisa",
    DISPLAY: "Display",
    SHOPPING: "Shopping",
    VIDEO: "Vídeo",
    PERFORMANCE_MAX: "Performance Max",
    DEMAND_GEN: "Demand Gen",
    DISCOVERY: "Discovery",
    MULTI_CHANNEL: "App",
    LOCAL: "Local",
    SMART: "Inteligente",
    HOTEL: "Hotel",
    LOCAL_SERVICES: "Serviços locais",
    TRAVEL: "Viagens",
};

const formatCustomerId = (id: string) => id.length === 10 ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id;

function useFormatters(currency: string) {
    return useMemo(() => {
        const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" });
        const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
        const dec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
        return {
            money: (v: number) => money.format(v),
            int: (v: number) => int.format(v),
            dec: (v: number) => dec.format(v),
            pct: (v: number) => `${dec.format(v)}%`,
            ratio: (v: number) => `${dec.format(v)}x`,
        };
    }, [currency]);
}

/* ------------------------------------------------------------------ *
 *  Account picker                                                     *
 * ------------------------------------------------------------------ */

function GoogleAccountPicker({ accounts, value, onChange }: {
    accounts: GoogleAdsAccountView[];
    value: string | null;
    onChange: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const selected = accounts.find(a => a.customer_id === value);

    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    }, []);

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(query.toLowerCase()) || a.customer_id.includes(query.replace(/\D/g, "") || "§"),
    );

    return (
        <div ref={ref} className="relative w-full sm:w-auto">
            <button
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cn(
                    "flex h-9 w-full sm:w-72 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left shadow-xs transition-colors hover:bg-accent",
                    open && "border-ring ring-2 ring-ring/20",
                )}
            >
                <GoogleAdsIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected?.name ?? "Selecionar conta"}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute right-0 z-40 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                    {accounts.length > 6 && (
                        <div className="relative mb-1.5">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar por nome ou ID..."
                                className="w-full rounded-lg bg-muted py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/25"
                            />
                        </div>
                    )}
                    <div className="max-h-80 overflow-y-auto no-scrollbar" role="listbox">
                        {filtered.map(a => (
                            <button
                                key={a.customer_id}
                                role="option"
                                aria-selected={a.customer_id === value}
                                onClick={() => { onChange(a.customer_id); setOpen(false); setQuery(""); }}
                                className={cn(
                                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                                    a.customer_id === value ? "bg-accent" : "hover:bg-accent/60",
                                )}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-foreground">{a.name}</span>
                                    <span className="block truncate text-[11px] text-muted-foreground">
                                        {formatCustomerId(a.customer_id)} · {a.currency}{a.via_manager ? ` · via MCC ${formatCustomerId(a.via_manager)}` : ""}
                                    </span>
                                </span>
                                {a.customer_id === value && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ *
 *  Daily chart                                                        *
 * ------------------------------------------------------------------ */

type ChartMetric = "cost" | "clicks" | "conversions";

function DailyChart({ report, fmt }: { report: GoogleAdsReport; fmt: ReturnType<typeof useFormatters> }) {
    const [metric, setMetric] = useState<ChartMetric>("cost");
    const data = useMemo(
        () => report.daily.map(d => ({ ...d, date: new Date(`${d.date}T12:00:00`).getTime() })),
        [report.daily],
    );
    const labels: Record<ChartMetric, string> = { cost: "Investimento", clicks: "Cliques", conversions: "Conversões" };
    const format = (v: number) => metric === "cost" ? fmt.money(v) : fmt.dec(v);

    return (
        <div className="glass-card rounded-xl p-4 sm:p-6">
            <SectionTitle
                title="Evolução diária"
                description={`${labels[metric]} por dia no período selecionado`}
                actions={
                    <div className="flex rounded-lg border border-border bg-muted p-0.5">
                        {(Object.keys(labels) as ChartMetric[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                    metric === m ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {labels[m]}
                            </button>
                        ))}
                    </div>
                }
            />
            <div className="mt-4 h-[260px] w-full">
                {data.length < 2 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Selecione um período com pelo menos 2 dias para ver o gráfico.
                    </div>
                ) : (
                    <AreaChart key={metric} data={data} xKey="date" margin={{ top: 12, right: 8, bottom: 36, left: 52 }} animationDuration={700}>
                        <Grid horizontal vertical={false} numTicksRows={4} strokeDasharray="3,4" />
                        <Area dataKey={metric} fillOpacity={0.25} strokeWidth={2.25} gradientToOpacity={0} fadeEdges animate showLine showHighlight />
                        <XAxis numTicks={Math.min(7, data.length)} tickerHalfWidth={40} />
                        <YAxis numTicks={4} formatValue={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))} />
                        <ChartTooltip
                            showDatePill
                            showCrosshair
                            showDots
                            rows={point => [{
                                color: "var(--chart-line-primary)",
                                label: labels[metric],
                                value: format(typeof point[metric] === "number" ? point[metric] as number : 0),
                            }]}
                        />
                    </AreaChart>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 *  Campaigns table                                                    *
 * ------------------------------------------------------------------ */

type SortKey = "name" | "cost" | "impressions" | "clicks" | "ctr" | "avg_cpc" | "conversions" | "cost_per_conversion" | "roas";

function CampaignStatusToggle({ customerId, campaign, onChanged }: {
    customerId: string;
    campaign: GoogleAdsCampaignRow;
    onChanged: (status: string) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const enabled = campaign.status === "ENABLED";

    const toggle = async () => {
        const next = enabled ? "PAUSED" : "ENABLED";
        const verb = enabled ? "pausar" : "ativar";
        if (!confirm(`Deseja ${verb} a campanha "${campaign.name}" no Google Ads?`)) return;
        setBusy(true);
        setError(null);
        const res = await setGoogleAdsCampaignStatusAction(customerId, campaign.id, next);
        setBusy(false);
        if (res.success) onChanged(next);
        else setError(res.error ?? "Falha ao alterar status");
    };

    return (
        <div className="flex items-center gap-2" title={error ?? undefined}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                <Switch checked={enabled} onCheckedChange={toggle} aria-label={enabled ? "Pausar campanha" : "Ativar campanha"} />
            )}
            {error && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </div>
    );
}

function CampaignsTable({ customerId, report, fmt, onStatusChange }: {
    customerId: string;
    report: GoogleAdsReport;
    fmt: ReturnType<typeof useFormatters>;
    onStatusChange: (campaignId: string, status: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "ENABLED" | "PAUSED">("all");
    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "cost", dir: "desc" });

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = report.campaigns.filter(c =>
            (statusFilter === "all" || c.status === statusFilter) && (!q || c.name.toLowerCase().includes(q)),
        );
        return [...list].sort((a, b) => {
            const av = a[sort.key], bv = b[sort.key];
            const cmp = typeof av === "string" ? av.localeCompare(bv as string, "pt-BR") : (av as number) - (bv as number);
            return sort.dir === "asc" ? cmp : -cmp;
        });
    }, [report.campaigns, query, statusFilter, sort]);

    const header = (key: SortKey, label: string, align: "left" | "right" = "right") => (
        <th className={cn("px-3 py-2.5 font-medium whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
            <button
                onClick={() => setSort(s => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
                className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.key === key && "text-foreground")}
            >
                {label}
                {sort.key === key && (sort.dir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
            </button>
        </th>
    );

    return (
        <div className="glass-card overflow-hidden rounded-xl">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle title="Campanhas" description={`${report.campaigns.length} campanhas no período`} />
                <div className="flex flex-col gap-2 xs:flex-row">
                    <div className="flex rounded-lg border border-border bg-muted p-0.5">
                        {([["all", "Todas"], ["ENABLED", "Ativas"], ["PAUSED", "Pausadas"]] as const).map(([v, l]) => (
                            <button
                                key={v}
                                onClick={() => setStatusFilter(v)}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                    statusFilter === v ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar campanha..."
                            className="h-8 w-full xs:w-56 rounded-lg border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/25"
                        />
                    </div>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {report.campaigns.length === 0 ? "Nenhuma campanha com dados neste período." : "Nenhuma campanha corresponde aos filtros."}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2.5 text-left font-medium w-14">Status</th>
                                {header("name", "Campanha", "left")}
                                {header("cost", "Investimento")}
                                {header("impressions", "Impressões")}
                                {header("clicks", "Cliques")}
                                {header("ctr", "CTR")}
                                {header("avg_cpc", "CPC médio")}
                                {header("conversions", "Conversões")}
                                {header("cost_per_conversion", "Custo/conv.")}
                                {header("roas", "ROAS")}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map(c => (
                                <tr key={c.id} className="transition-colors hover:bg-muted/40">
                                    <td className="px-3 py-3">
                                        <CampaignStatusToggle customerId={customerId} campaign={c} onChanged={s => onStatusChange(c.id, s)} />
                                    </td>
                                    <td className="px-3 py-3 min-w-[220px]">
                                        <p className="font-medium text-foreground line-clamp-1" title={c.name}>{c.name}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <Badge variant="neutral" className="normal-case tracking-normal text-[10px]">{CHANNEL_LABELS[c.channel] ?? c.channel}</Badge>
                                            {c.daily_budget != null && (
                                                <span className="text-[11px] text-muted-foreground">{fmt.money(c.daily_budget)}/dia</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-right tabular font-semibold text-foreground">{fmt.money(c.cost)}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt.int(c.impressions)}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt.int(c.clicks)}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt.pct(c.ctr)}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{c.clicks > 0 ? fmt.money(c.avg_cpc) : "—"}</td>
                                    <td className="px-3 py-3 text-right tabular text-foreground">{fmt.dec(c.conversions)}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{c.conversions > 0 ? fmt.money(c.cost_per_conversion) : "—"}</td>
                                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{c.conversions_value > 0 ? fmt.ratio(c.roas) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ *
 *  Page                                                               *
 * ------------------------------------------------------------------ */

function Banner({ tone, children, onClose }: { tone: "error" | "warning" | "success"; children: React.ReactNode; onClose?: () => void }) {
    const styles = {
        error: "border-destructive/30 bg-destructive/10 text-destructive",
        warning: "border-warning/30 bg-warning/10 text-warning",
        success: "border-success/30 bg-success/10 text-success",
    }[tone];
    return (
        <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", styles)}>
            {tone === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div className="flex-1">{children}</div>
            {onClose && (
                <button onClick={onClose} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Fechar aviso">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

export function GoogleAdsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { startDate, endDate } = useDate();

    const [status, setStatus] = useState<GoogleAdsStatus | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [report, setReport] = useState<GoogleAdsReport | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    // Messages coming back from the OAuth callback
    const [notice, setNotice] = useState<{ tone: "error" | "warning" | "success"; text: string } | null>(() => {
        const error = searchParams.get("error");
        const warning = searchParams.get("warning");
        if (error) return { tone: "error", text: error };
        if (warning) return { tone: "warning", text: `Conectado, mas não foi possível listar as contas: ${warning}` };
        if (searchParams.get("connected")) return { tone: "success", text: "Google Ads conectado com sucesso." };
        return null;
    });

    // Drop the callback params so a refresh doesn't show the message again
    useEffect(() => {
        if (searchParams.get("error") || searchParams.get("warning") || searchParams.get("connected")) {
            router.replace("/google-ads", { scroll: false });
        }
    }, [searchParams, router]);

    const applyStatus = useCallback((s: GoogleAdsStatus) => {
        setStatus(s);
        const visible = s.accounts.filter(a => !a.is_hidden);
        let stored: string | null = null;
        try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }
        setCustomerId(prev => {
            const keep = [prev, stored].find(id => id && visible.some(a => a.customer_id === id));
            return keep ?? visible[0]?.customer_id ?? null;
        });
    }, []);

    const loadStatus = useCallback(() => getGoogleAdsStatusAction().then(applyStatus), [applyStatus]);

    useEffect(() => { getGoogleAdsStatusAction().then(applyStatus); }, [applyStatus]);

    const selectAccount = (id: string) => {
        setCustomerId(id);
        try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
    };

    // Loading is derived: the request for `reportKey` is in flight until a result tagged with it lands
    const reportKey = customerId && startDate && endDate ? `${customerId}|${startDate}|${endDate}|${reloadKey}` : null;
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const loadingReport = !!reportKey && loadedKey !== reportKey;

    useEffect(() => {
        if (!reportKey) return;
        const [cid, start, end] = reportKey.split("|");
        let cancelled = false;
        fetchGoogleAdsReportAction(cid, start, end).then(res => {
            if (cancelled) return;
            setReport(res.data ?? null);
            setReportError(res.data ? null : res.error ?? "Erro ao carregar relatório");
            setLoadedKey(reportKey);
        });
        return () => { cancelled = true; };
    }, [reportKey]);

    const sync = async () => {
        setSyncing(true);
        const res = await syncGoogleAdsAccountsAction();
        setSyncing(false);
        if (res.success) {
            setNotice({ tone: "success", text: `${res.count} conta(s) sincronizada(s).` });
            await loadStatus();
        } else {
            setNotice({ tone: "error", text: res.error ?? "Falha ao sincronizar" });
        }
    };

    const disconnect = async () => {
        if (!confirm("Desconectar o Google Ads deste workspace? As contas sincronizadas serão removidas da plataforma (nada muda no Google Ads).")) return;
        const res = await disconnectGoogleAdsAction();
        if (res.success) { setReport(null); setCustomerId(null); await loadStatus(); }
        else setNotice({ tone: "error", text: res.error ?? "Falha ao desconectar" });
    };

    const fmt = useFormatters(report?.currency ?? "BRL");
    const visibleAccounts = status?.accounts.filter(a => !a.is_hidden) ?? [];

    const header = (actions?: React.ReactNode) => (
        <PageHeader
            eyebrow="Canais"
            title="Google Ads"
            icon={GoogleAdsIcon}
            description={status?.connected
                ? <>Conectado como <span className="font-medium text-foreground">{status.email ?? "conta Google"}</span></>
                : "Acompanhe investimento, conversões e campanhas do Google Ads ao lado do Meta Ads."}
            actions={actions}
        />
    );

    if (!status) {
        return (
            <div className="space-y-6">
                {header()}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
                </div>
                <Skeleton className="h-[320px] rounded-xl" />
            </div>
        );
    }

    const configured = status.config.clientId && status.config.clientSecret && status.config.developerToken;

    if (!configured) {
        const items = [
            { ok: status.config.clientId, env: "GOOGLE_ADS_CLIENT_ID", label: "Client ID do OAuth (Google Cloud → Credenciais → App da Web)" },
            { ok: status.config.clientSecret, env: "GOOGLE_ADS_CLIENT_SECRET", label: "Client Secret do mesmo cliente OAuth" },
            { ok: status.config.developerToken, env: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer token (Google Ads → Ferramentas → Central de API)" },
        ];
        return (
            <div className="space-y-6">
                {notice && <Banner tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Banner>}
                {header()}
                <EmptyState
                    icon={GoogleAdsIcon}
                    title="Falta configurar o servidor"
                    description="Para conectar o Google Ads, o administrador precisa definir estas variáveis de ambiente e reiniciar a aplicação."
                    action={
                        <ul className="w-full max-w-lg space-y-2 text-left">
                            {items.map(i => (
                                <li key={i.env} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", i.ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                                        {i.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    </span>
                                    <span className="min-w-0">
                                        <code className="text-xs font-semibold text-foreground">{i.env}</code>
                                        <span className="block text-xs text-muted-foreground">{i.label}</span>
                                    </span>
                                </li>
                            ))}
                            <li className="px-1 pt-1 text-xs text-muted-foreground">
                                URI de redirecionamento autorizado no cliente OAuth: <code className="text-foreground">{typeof window !== "undefined" ? window.location.origin : ""}/api/auth/google-ads/callback</code>
                            </li>
                        </ul>
                    }
                />
            </div>
        );
    }

    if (!status.connected) {
        return (
            <div className="space-y-6">
                {notice && <Banner tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Banner>}
                {header()}
                <EmptyState
                    icon={GoogleAdsIcon}
                    title="Conecte sua conta do Google Ads"
                    description="Use o login Google que tem acesso às contas de anúncio (ou à conta de administrador/MCC). As contas são importadas automaticamente."
                    action={
                        <a href="/api/auth/google-ads">
                            <Button variant="primary" size="lg"><GoogleAdsIcon className="h-4 w-4" /> Conectar Google Ads</Button>
                        </a>
                    }
                />
            </div>
        );
    }

    const headerActions = (
        <>
            {visibleAccounts.length > 0 && <GoogleAccountPicker accounts={visibleAccounts} value={customerId} onChange={selectAccount} />}
            <Button variant="outline" onClick={sync} isLoading={syncing} title="Buscar contas novamente no Google Ads">
                {!syncing && <RefreshCw className="h-4 w-4" />} Sincronizar
            </Button>
            <Button variant="ghost" size="icon" onClick={disconnect} title="Desconectar Google Ads" aria-label="Desconectar Google Ads">
                <LogOut className="h-4 w-4" />
            </Button>
        </>
    );

    const s = report?.summary;

    return (
        <div className="space-y-6">
            {notice && <Banner tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Banner>}
            {header(headerActions)}

            {status.lastError && (
                <Banner tone="warning">
                    {status.lastError}{" "}
                    <a href="/api/auth/google-ads" className="font-semibold underline underline-offset-2">Reconectar</a>
                </Banner>
            )}

            {visibleAccounts.length === 0 ? (
                <EmptyState
                    icon={Target}
                    title="Nenhuma conta de anúncio encontrada"
                    description="O login conectado não tem acesso a contas ativas. Verifique as permissões no Google Ads ou conecte outro usuário. Se o developer token estiver em nível de teste, ele só enxerga contas de teste."
                    action={<Button variant="outline" onClick={sync} isLoading={syncing}>Sincronizar novamente</Button>}
                />
            ) : reportError && !loadingReport ? (
                <EmptyState
                    icon={AlertTriangle}
                    title="Não foi possível carregar os dados"
                    description={reportError}
                    action={<Button variant="outline" onClick={() => setReloadKey(k => k + 1)}>Tentar novamente</Button>}
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        <StatCard label="Investimento" icon={Wallet} value={s ? fmt.money(s.cost) : "—"} loading={loadingReport} highlight />
                        <StatCard label="Impressões" icon={Eye} value={s ? fmt.int(s.impressions) : "—"} loading={loadingReport} />
                        <StatCard label="Cliques" icon={MousePointerClick} value={s ? fmt.int(s.clicks) : "—"} loading={loadingReport}
                            hint={s && s.impressions > 0 ? `CTR ${fmt.pct(s.ctr)}` : undefined} />
                        <StatCard label="CPC médio" icon={CircleDollarSign} value={s && s.clicks > 0 ? fmt.money(s.avg_cpc) : "—"} loading={loadingReport} />
                        <StatCard label="Conversões" icon={Target} value={s ? fmt.dec(s.conversions) : "—"} loading={loadingReport} />
                        <StatCard label="Custo por conversão" icon={BarChart3} value={s && s.conversions > 0 ? fmt.money(s.cost_per_conversion) : "—"} loading={loadingReport} />
                        <StatCard label="Valor de conversão" icon={TrendingUp} value={s ? fmt.money(s.conversions_value) : "—"} loading={loadingReport} />
                        <StatCard label="ROAS" icon={Percent} value={s && s.conversions_value > 0 ? fmt.ratio(s.roas) : "—"} loading={loadingReport}
                            hint="Valor de conversão ÷ investimento" />
                        <StatCard label="CTR" icon={MousePointerClick} value={s ? fmt.pct(s.ctr) : "—"} loading={loadingReport} />
                        <StatCard label="Campanhas" icon={Target} value={report ? fmt.int(report.campaigns.length) : "—"} loading={loadingReport}
                            hint={report ? `${report.campaigns.filter(c => c.status === "ENABLED").length} ativas` : undefined} />
                    </div>

                    {loadingReport && !report ? (
                        <Skeleton className="h-[340px] rounded-xl" />
                    ) : report && (
                        <div className={cn("space-y-6 transition-opacity", loadingReport && "opacity-60")}>
                            <DailyChart report={report} fmt={fmt} />
                            <CampaignsTable
                                customerId={customerId!}
                                report={report}
                                fmt={fmt}
                                onStatusChange={(id, st) => setReport(r => r && ({
                                    ...r,
                                    campaigns: r.campaigns.map(c => c.id === id ? { ...c, status: st } : c),
                                }))}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
