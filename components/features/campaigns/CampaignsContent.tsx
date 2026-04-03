"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import {
    TrendingUp, Eye, MousePointer, DollarSign, MessageSquare,
    ChevronRight, ChevronDown, Layers, Image as ImageIcon,
} from "lucide-react";
import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { useEffect, useState, useCallback } from "react";
import {
    fetchCampaignsAction,
    fetchAdSetsForCampaignAction,
    fetchAdsForAdSetAction,
    updateCampaignStatusAction,
    updateAdSetStatusAction,
    updateAdStatusAction,
} from "@/actions/meta-actions";
import { MetaCampaign, MetaAdSet, MetaCreative } from "@/lib/balance-utils";
import { Skeleton } from "@/components/ui/Skeleton";

const statusMap: Record<string, "success" | "warning" | "neutral" | "danger" | "default"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    ARCHIVED: "neutral",
    DELETED: "danger",
};

const fmt = (v: string | undefined) =>
    v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(v)) : "-";

// ── Ad row ────────────────────────────────────────────────────────────────────
function AdRow({ ad, accountId, metricFilter }: {
    ad: MetaCreative;
    accountId: string;
    metricFilter: string;
}) {
    const [status, setStatus] = useState(ad.status);
    const [toggling, setToggling] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    const toggle = async () => {
        const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        setToggling(true);
        const res = await updateAdStatusAction(accountId, ad.id, next);
        if (res.success) setStatus(next);
        setToggling(false);
    };

    const convos = parseInt(ad.insights?.conversations || "0");
    const spend   = parseFloat(ad.insights?.spend       || "0");
    const cpr     = convos > 0 ? spend / convos : null;
    const imgSrc  = ad.thumbnail_url && !imgFailed ? ad.thumbnail_url : null;

    return (
        <TableRow className="bg-zinc-950/60 border-zinc-800/30">
            {/* indent */}
            <TableCell className="pl-16">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {imgSrc
                            ? <img src={imgSrc} alt="" onError={() => setImgFailed(true)} className="w-full h-full object-cover" />
                            : <ImageIcon className="h-3 w-3 text-zinc-600" />
                        }
                    </div>
                    <div>
                        <div className="text-xs font-medium text-zinc-300">{ad.name}</div>
                        <div className="text-[10px] text-zinc-600">{ad.id}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Switch
                        checked={status === "ACTIVE"}
                        onCheckedChange={toggle}
                        disabled={toggling}
                        className="scale-75"
                    />
                    <Badge variant={statusMap[status] || "default"} className="text-[10px] py-0">{status}</Badge>
                </div>
            </TableCell>
            <TableCell className="text-xs text-zinc-500">—</TableCell>
            <TableCell className="text-xs">{ad.insights?.impressions || "-"}</TableCell>
            <TableCell className="text-xs">{ad.insights?.clicks || "-"}</TableCell>
            <TableCell className="text-xs">{convos || "0"}</TableCell>
            <TableCell className="text-xs">
                {cpr != null ? `R$ ${cpr.toFixed(2)}` : "-"}
            </TableCell>
            <TableCell className="text-right text-xs">{fmt(ad.insights?.spend)}</TableCell>
        </TableRow>
    );
}

// ── Ad-set row ────────────────────────────────────────────────────────────────
function AdSetRow({ adset, accountId, metricFilter }: {
    adset: MetaAdSet;
    accountId: string;
    metricFilter: string;
}) {
    const [status, setStatus]     = useState(adset.status);
    const [toggling, setToggling] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [ads, setAds]           = useState<MetaCreative[]>([]);
    const [loadingAds, setLoadingAds] = useState(false);

    const { preset } = useDate();

    const toggle = async () => {
        const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        setToggling(true);
        const res = await updateAdSetStatusAction(accountId, adset.id, next);
        if (res.success) setStatus(next);
        setToggling(false);
    };

    const expand = useCallback(async () => {
        const next = !expanded;
        setExpanded(next);
        if (next && ads.length === 0) {
            setLoadingAds(true);
            try {
                const data = await fetchAdsForAdSetAction(accountId, adset.id, preset);
                setAds(data);
            } finally {
                setLoadingAds(false);
            }
        }
    }, [expanded, ads.length, accountId, adset.id, preset]);

    const convos = parseInt(adset.insights?.conversations || "0");
    const spend   = parseFloat(adset.insights?.spend       || "0");
    const cpr     = convos > 0 ? spend / convos : null;

    return (
        <>
            <TableRow className="bg-zinc-900/50 border-zinc-800/50 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                <TableCell className="pl-8" onClick={expand}>
                    <div className="flex items-center gap-2">
                        {expanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        }
                        <Layers className="h-3 w-3 text-zinc-500 shrink-0" />
                        <div>
                            <div className="text-xs font-medium text-zinc-200">{adset.name}</div>
                            <div className="text-[10px] text-zinc-600">{adset.id}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={status === "ACTIVE"}
                            onCheckedChange={toggle}
                            disabled={toggling}
                            className="scale-75"
                        />
                        <Badge variant={statusMap[status] || "default"} className="text-[10px] py-0">{status}</Badge>
                    </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">—</TableCell>
                <TableCell className="text-xs">{adset.insights?.impressions || "-"}</TableCell>
                <TableCell className="text-xs">{adset.insights?.clicks || "-"}</TableCell>
                <TableCell className="text-xs">{convos || "0"}</TableCell>
                <TableCell className="text-xs">
                    {cpr != null ? `R$ ${cpr.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right text-xs">{fmt(adset.insights?.spend)}</TableCell>
            </TableRow>

            {expanded && (
                loadingAds
                    ? Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i} className="bg-zinc-950/60">
                            <TableCell colSpan={8} className="pl-16 py-2">
                                <Skeleton className="h-3 w-64" />
                            </TableCell>
                        </TableRow>
                    ))
                    : ads.length === 0
                        ? (
                            <TableRow className="bg-zinc-950/60">
                                <TableCell colSpan={8} className="pl-16 py-2 text-xs text-zinc-600">
                                    Nenhum anúncio encontrado.
                                </TableCell>
                            </TableRow>
                        )
                        : ads.map(ad => (
                            <AdRow key={ad.id} ad={ad} accountId={accountId} metricFilter={metricFilter} />
                        ))
            )}
        </>
    );
}

// ── Campaign row ──────────────────────────────────────────────────────────────
function CampaignRow({ campaign, accountId, metricFilter }: {
    campaign: MetaCampaign;
    accountId: string;
    metricFilter: string;
}) {
    const [status, setStatus]         = useState(campaign.status);
    const [toggling, setToggling]     = useState(false);
    const [expanded, setExpanded]     = useState(false);
    const [adsets, setAdsets]         = useState<MetaAdSet[]>([]);
    const [loadingAdsets, setLoading] = useState(false);

    const { preset } = useDate();

    const toggle = async () => {
        const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        setToggling(true);
        const res = await updateCampaignStatusAction(accountId, campaign.id, next);
        if (res.success) setStatus(next);
        setToggling(false);
    };

    const expand = useCallback(async () => {
        const next = !expanded;
        setExpanded(next);
        if (next && adsets.length === 0) {
            setLoading(true);
            try {
                const data = await fetchAdSetsForCampaignAction(accountId, campaign.id, preset);
                setAdsets(data);
            } finally {
                setLoading(false);
            }
        }
    }, [expanded, adsets.length, accountId, campaign.id, preset]);

    const convos = parseInt(campaign.insights?.conversations || "0");
    const spend   = parseFloat(campaign.insights?.spend       || "0");
    const cpr     = convos > 0 ? spend / convos : null;

    const specificMetric =
        metricFilter === "sales"      ? campaign.insights?.sales :
        metricFilter === "leads_form" ? campaign.insights?.leads_form :
        metricFilter === "leads_gtm"  ? campaign.insights?.leads_gtm :
        convos > 0                    ? convos.toString() : (campaign.insights?.leads || "0");

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-zinc-800/30 transition-colors"
                onClick={expand}
            >
                <TableCell>
                    <div className="flex items-center gap-2">
                        {expanded
                            ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                        }
                        <div>
                            <div className="font-medium text-foreground">{campaign.name}</div>
                            <div className="text-xs text-muted-foreground">{campaign.id}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={status === "ACTIVE"}
                            onCheckedChange={toggle}
                            disabled={toggling}
                            className="scale-90"
                        />
                        <Badge variant={statusMap[status] || "default"}>{status}</Badge>
                    </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-400">{campaign.objective}</TableCell>
                <TableCell>{campaign.insights?.impressions || "-"}</TableCell>
                <TableCell>{campaign.insights?.clicks || "-"}</TableCell>
                <TableCell>{specificMetric || "0"}</TableCell>
                <TableCell>
                    {cpr != null ? `R$ ${cpr.toFixed(2)}` : (
                        campaign.insights?.cpc
                            ? `R$ ${parseFloat(campaign.insights.cpc).toFixed(2)}`
                            : "-"
                    )}
                </TableCell>
                <TableCell className="text-right font-medium">{fmt(campaign.insights?.spend)}</TableCell>
            </TableRow>

            {expanded && (
                loadingAdsets
                    ? Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i} className="bg-zinc-900/50">
                            <TableCell colSpan={8} className="pl-8 py-2">
                                <Skeleton className="h-3 w-56" />
                            </TableCell>
                        </TableRow>
                    ))
                    : adsets.length === 0
                        ? (
                            <TableRow className="bg-zinc-900/50">
                                <TableCell colSpan={8} className="pl-8 py-2 text-xs text-zinc-600">
                                    Nenhum conjunto encontrado.
                                </TableCell>
                            </TableRow>
                        )
                        : adsets.map(adset => (
                            <AdSetRow key={adset.id} adset={adset} accountId={accountId} metricFilter={metricFilter} />
                        ))
            )}
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CampaignsContent({ metricFilter = "all" }: { metricFilter?: "all" | "sales" | "leads_form" | "leads_gtm" }) {
    const { selectedAccount } = useAccount();
    const { preset } = useDate();
    const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            fetchCampaignsAction(selectedAccount.id, preset)
                .then(setCampaigns)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [selectedAccount, preset]);

    if (!selectedAccount) {
        return <div className="text-foreground">Selecione uma conta para ver as campanhas.</div>;
    }

    const metricNames: Record<string, string> = {
        all:        "Conversas / Leads",
        sales:      "Vendas (GTM)",
        leads_form: "Leads Form",
        leads_gtm:  "Leads GTM",
    };

    const sorted = [...campaigns].sort((a, b) => {
        const sa = parseFloat(a.insights?.spend || "0");
        const sb = parseFloat(b.insights?.spend || "0");
        if (sb !== sa) return sb - sa;
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">Performance das Campanhas</h2>
                    <p className="text-sm text-muted-foreground">
                        {loading
                            ? "Carregando campanhas..."
                            : <><span className="hidden sm:inline">Conta: {selectedAccount.name} — </span>Clique para expandir conjuntos e anúncios</>}
                    </p>
                </div>
            </div>

            <GlassCard className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campanha / Conjunto / Anúncio</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Objetivo</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" /> Impressões
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <MousePointer className="h-3 w-3" /> Cliques
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> {metricNames[metricFilter]}
                                    </div>
                                </TableHead>
                                <TableHead>CPR / CPC</TableHead>
                                <TableHead className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <DollarSign className="h-3 w-3" /> Gasto
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-48 mb-1" />
                                            <Skeleton className="h-3 w-24" />
                                        </TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : sorted.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhuma campanha encontrada nesta conta.
                                    </TableCell>
                                </TableRow>
                            ) : sorted.map(campaign => (
                                <CampaignRow
                                    key={campaign.id}
                                    campaign={campaign}
                                    accountId={selectedAccount.id}
                                    metricFilter={metricFilter}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </GlassCard>
        </div>
    );
}
