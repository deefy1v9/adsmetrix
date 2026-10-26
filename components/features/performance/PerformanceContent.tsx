"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
    TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronRight,
    Image as ImageIcon, DollarSign, MessageSquare, Pause, Play,
} from "lucide-react";
import {
    fetchAllAccountsPerformanceAction,
    fetchAdsByCPRAction,
    saveMaxCprAction,
    updateAdStatusAction,
    AccountPerformance,
} from "@/actions/meta-actions";
import { MetaCreative } from "@/lib/balance-utils";

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// ── Ad row inside expanded card ────────────────────────────────────────────────
function AdRow({ ad, accountId }: { ad: MetaCreative; accountId: string }) {
    const [status, setStatus]     = useState(ad.status);
    const [toggling, setToggling] = useState(false);

    const toggle = async () => {
        const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        setToggling(true);
        const res = await updateAdStatusAction(accountId, ad.id, next);
        if (res.success) setStatus(next);
        setToggling(false);
    };

    const spend   = parseFloat(ad.insights?.spend        || "0");
    const convos  = parseInt(ad.insights?.conversations  || "0");
    const cpr     = convos > 0 ? spend / convos : null;
    const isActive = status === "ACTIVE";

    return (
        <div className={`flex items-center gap-3 py-2 px-3 rounded-lg border transition-colors ${
            isActive ? "border-border bg-surface" : "border-border/60 bg-muted/40 opacity-60"
        }`}>
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {ad.thumbnail_url
                    ? <img src={ad.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="h-4 w-4 text-muted-foreground" />
                }
            </div>

            {/* Name + ID */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{ad.name}</div>
                <div className="text-[10px] text-muted-foreground tabular">{ad.id}</div>
            </div>

            {/* CPR */}
            <div className="text-right shrink-0">
                <div className="text-xs font-semibold text-foreground tabular">
                    {cpr != null ? fmt(cpr) : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                    {convos > 0 ? `${convos} conv.` : spend > 0 ? "sem conv." : "sem dados"}
                </div>
            </div>

            {/* Spend */}
            <div className="text-right shrink-0 w-20">
                <div className="text-xs text-muted-foreground tabular">{spend > 0 ? fmt(spend) : "—"}</div>
            </div>

            {/* Toggle */}
            <Switch
                checked={isActive}
                onCheckedChange={toggle}
                disabled={toggling}
                className="scale-75 shrink-0"
            />
        </div>
    );
}

// ── Account card ───────────────────────────────────────────────────────────────
function AccountCard({
    account,
    datePreset,
}: {
    account: AccountPerformance;
    datePreset: string;
}) {
    const [maxCpr, setMaxCpr]           = useState<string>(account.maxCpr?.toFixed(2) ?? "");
    const [saving, setSaving]           = useState(false);
    const [expanded, setExpanded]       = useState(false);
    const [ads, setAds]                 = useState<MetaCreative[]>([]);
    const [loadingAds, setLoadingAds]   = useState(false);

    const avgCpr = account.avgCpr;
    const maxCprNum = parseFloat(maxCpr) || null;
    const overBudget = avgCpr != null && maxCprNum != null && avgCpr > maxCprNum;
    const nearBudget = avgCpr != null && maxCprNum != null && !overBudget && avgCpr > maxCprNum * 0.85;

    const saveMax = async () => {
        setSaving(true);
        await saveMaxCprAction(account.accountId, parseFloat(maxCpr) || null);
        setSaving(false);
    };

    const expand = useCallback(async () => {
        const next = !expanded;
        setExpanded(next);
        if (next && ads.length === 0) {
            setLoadingAds(true);
            try {
                const data = await fetchAdsByCPRAction(account.accountId, datePreset);
                setAds(data);
            } finally {
                setLoadingAds(false);
            }
        }
    }, [expanded, ads.length, account.accountId, datePreset]);

    const statusColor = overBudget
        ? "border-destructive/40"
        : nearBudget
            ? "border-warning/40"
            : "border-border";

    return (
        <GlassCard className={`relative overflow-hidden border ${statusColor} transition-colors`}>
            {(overBudget || nearBudget) && (
                <div className={`absolute inset-x-0 top-0 h-0.5 ${overBudget ? "bg-destructive" : "bg-warning"}`} />
            )}
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {overBudget && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        {nearBudget && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                        <h3 className="font-semibold text-foreground truncate">{account.accountName}</h3>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 tabular">{account.accountId}</div>
                </div>

                {/* CPR badge */}
                <div className="text-right shrink-0">
                    <div className={`text-2xl font-bold tracking-tight tabular ${
                        overBudget ? "text-destructive" : nearBudget ? "text-warning" : "text-foreground"
                    }`}>
                        {avgCpr != null ? fmt(avgCpr) : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">CPR médio</div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <DollarSign className="h-3 w-3" /> Gasto total
                    </div>
                    <div className="font-semibold text-sm text-foreground tabular">{fmt(account.totalSpend)}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3 w-3" /> Conversas
                    </div>
                    <div className="font-semibold text-sm text-foreground tabular">{account.totalConversations}</div>
                </div>
            </div>

            {/* Max CPR config */}
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">CPR máximo (R$)</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 15.00"
                        value={maxCpr}
                        onChange={e => setMaxCpr(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
                <Button
                    size="sm"
                    onClick={saveMax}
                    disabled={saving}
                    className="mt-5 shrink-0"
                >
                    {saving ? "..." : "Salvar"}
                </Button>
            </div>

            {/* Expand ads button */}
            <button
                onClick={expand}
                className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 border-t border-border pt-3"
            >
                <span>
                    {expanded ? "Ocultar anúncios" : "Ver anúncios por CPR"}
                </span>
                {expanded
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />
                }
            </button>

            {/* Ads list */}
            {expanded && (
                <div className="mt-3 space-y-2">
                    {loadingAds ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                                <Skeleton className="w-10 h-10 rounded" />
                                <div className="flex-1">
                                    <Skeleton className="h-3 w-40 mb-1" />
                                    <Skeleton className="h-2.5 w-24" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))
                    ) : ads.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Nenhum anúncio encontrado.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 text-[10px] text-muted-foreground font-medium">
                                <span>Anúncio</span>
                                <span className="text-right">CPR</span>
                                <span className="text-right w-20">Gasto</span>
                                <span className="sr-only">Toggle</span>
                            </div>
                            {ads.map(ad => (
                                <AdRow key={ad.id} ad={ad} accountId={account.accountId} />
                            ))}
                        </>
                    )}
                </div>
            )}
        </GlassCard>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PerformanceContent() {
    const [accounts, setAccounts]   = useState<AccountPerformance[]>([]);
    const [loading, setLoading]     = useState(true);
    const [datePreset, setDatePreset] = useState("last_30d");

    const load = useCallback(async (preset: string) => {
        setLoading(true);
        try {
            const data = await fetchAllAccountsPerformanceAction(preset);
            setAccounts(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(datePreset); }, [datePreset]);

    const presetOptions = [
        { value: "today",      label: "Hoje" },
        { value: "yesterday",  label: "Ontem" },
        { value: "last_7d",    label: "7 dias" },
        { value: "last_14d",   label: "14 dias" },
        { value: "last_30d",   label: "30 dias" },
        { value: "last_90d",   label: "90 dias" },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Análise"
                title="Performance"
                icon={TrendingUp}
                description="CPR médio por conta · configure limite · veja e pause criativos ruins"
                actions={
                    <div className="flex flex-wrap rounded-lg border border-border bg-muted p-0.5">
                        {presetOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDatePreset(opt.value)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    datePreset === opt.value
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
            />

            {/* Cards grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <GlassCard key={i}>
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-3 w-32 mb-4" />
                            <Skeleton className="h-8 w-24 mb-4" />
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <Skeleton className="h-14 rounded-lg" />
                                <Skeleton className="h-14 rounded-lg" />
                            </div>
                            <Skeleton className="h-8 w-full" />
                        </GlassCard>
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <EmptyState
                    icon={TrendingUp}
                    title="Nenhuma conta encontrada"
                    description="Conecte o Meta Ads em Integrações para acompanhar o CPR das suas contas."
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Sort: over-budget first, then by avgCpr descending */}
                    {[...accounts]
                        .sort((a, b) => {
                            const cprA = a.avgCpr ?? -1;
                            const cprB = b.avgCpr ?? -1;
                            return cprB - cprA;
                        })
                        .map(acc => (
                            <AccountCard key={acc.accountId} account={acc} datePreset={datePreset} />
                        ))
                    }
                </div>
            )}
        </div>
    );
}
