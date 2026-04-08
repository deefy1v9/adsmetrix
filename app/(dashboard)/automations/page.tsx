"use client";

import React, { useEffect, useState } from "react";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import { getUazAPIStatusAction, listGroupsAction } from "@/actions/uazapi-actions";
import type { WhatsAppGroup } from "@/lib/uazapi";
import {
    listAutomationsAction,
    createAutomationAction,
    updateAutomationAction,
    deleteAutomationAction,
    toggleAutomationAction,
    runAutomationNowAction,
    fetchCampaignListAction,
    previewAutomationAction,
    bulkUpdateDatePresetAction,
    AutomationRecord,
    AutomationFormData,
    type CampaignSummary,
} from "@/actions/automation-actions";
import {
    listWaBlastAutomationsAction,
    createWaBlastAutomationAction,
    updateWaBlastAutomationAction,
    deleteWaBlastAutomationAction,
    toggleWaBlastAutomationAction,
    runWaBlastNowAction,
    type WaBlastRecord,
    type WaBlastFormData,
} from "@/actions/wa-blast-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import {
    Loader2, Plus, Wifi, WifiOff, MessageSquare, Pencil, Trash2,
    Play, ArrowLeft, CheckSquare, Square, Terminal, Clock, Zap, Search,
    Phone, Users, Eye, EyeOff, Send, MessageCircle, Calendar, X,
} from "lucide-react";
import { MetaAdAccount } from "@/lib/meta-api";
import {
    METRIC_LABELS, DEFAULT_AUTOMATION_METRICS, MultiReportMetrics, getDateLabel,
} from "@/lib/multi-report-builder";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
    { value: "yesterday",         label: "Ontem" },
    { value: "today",             label: "Hoje" },
    { value: "last_3d_completed", label: "Últimos 3 dias" },
    { value: "last_7d",           label: "Últimos 7 dias" },
    { value: "last_30d",          label: "Últimos 30 dias" },
    { value: "this_month",        label: "Este mês" },
    { value: "last_month",        label: "Mês passado" },
];

const EMPTY_FORM: AutomationFormData = {
    name:             "",
    enabled:          true,
    account_ids:      [],
    date_preset:      "yesterday",
    schedule_time:    "09:00",
    metrics_config:   { ...DEFAULT_AUTOMATION_METRICS } as Record<string, boolean>,
    campaign_metrics: {},
    custom_message:   "",
    skip_weekends:    false,
    totals_only:      false,
    destination_type: "default",
    destination_id:   "",
    destination_name: "",
};

// ── Group Picker ──────────────────────────────────────────────────────────────

function GroupPicker({ value, name, onChange }: {
    value: string;
    name:  string;
    onChange: (id: string, label: string) => void;
}) {
    const [search,  setSearch]  = useState("");
    const [groups,  setGroups]  = useState<WhatsAppGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    const fetchGroups = async () => {
        setLoading(true);
        setError(null);
        const { groups: result, error: apiError } = await listGroupsAction();
        if (apiError) {
            setError(`Erro: ${apiError}`);
        } else if (result.length === 0) {
            setError("Nenhum grupo encontrado. Verifique se o WhatsApp está conectado.");
        }
        setGroups(result);
        setFetched(true);
        setLoading(false);
    };

    const filtered = groups.filter((g: WhatsAppGroup) =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-2 mt-2">
            <div className="flex gap-2">
                <input
                    value={search}
                    onChange={(e: { target: { value: string } }) => setSearch(e.target.value)}
                    placeholder={value ? (name || value) : "Pesquisar grupo..."}
                    className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                    type="button"
                    onClick={fetchGroups}
                    disabled={loading}
                    title="Buscar grupos"
                    className="p-2 rounded-xl bg-muted border border-border hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                >
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Search className="w-4 h-4" />}
                </button>
            </div>

            {value && !fetched && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl text-sm text-foreground">
                    <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                    {name || value}
                </div>
            )}

            {fetched && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-muted/50 divide-y divide-border">
                    {error && (
                        <p className="text-xs text-muted-foreground px-3 py-2">{error}</p>
                    )}
                    {filtered.map((g: WhatsAppGroup) => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => onChange(g.id, g.name)}
                            className={cn(
                                "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2",
                                g.id === value
                                    ? "bg-primary/10 text-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Users className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{g.name}</span>
                            {g.id === value && <CheckSquare className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Campaign Metrics Picker ───────────────────────────────────────────────────

function CampaignMetricsPicker({ accountIds, globalMetrics, value, onChange }: {
    accountIds:   string[];
    globalMetrics: Record<string, boolean>;
    value:        Record<string, Record<string, boolean>>;
    onChange:     (v: Record<string, Record<string, boolean>>) => void;
}) {
    const [campaigns,    setCampaigns]    = useState<CampaignSummary[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [fetched,      setFetched]      = useState(false);
    const [expandedId,   setExpandedId]   = useState<string | null>(null);

    const fetch = async () => {
        if (accountIds.length === 0) return;
        setLoading(true);
        const list = await fetchCampaignListAction(accountIds);
        setCampaigns(list);
        setFetched(true);
        setLoading(false);
    };

    const enableOverride = (id: string) => {
        onChange({ ...value, [id]: { ...globalMetrics } });
        setExpandedId(id);
    };

    const removeOverride = (id: string) => {
        const next = { ...value };
        delete next[id];
        onChange(next);
        if (expandedId === id) setExpandedId(null);
    };

    const toggleMetric = (campaignId: string, key: string) => {
        onChange({
            ...value,
            [campaignId]: { ...value[campaignId], [key]: !value[campaignId]?.[key] },
        });
    };

    const overriddenIds = new Set(Object.keys(value));

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Métricas por Campanha
                    {overriddenIds.size > 0 && (
                        <span className="ml-2 text-primary normal-case font-normal">
                            ({overriddenIds.size} personalizada{overriddenIds.size > 1 ? 's' : ''})
                        </span>
                    )}
                </label>
                <button
                    type="button"
                    onClick={fetch}
                    disabled={loading || accountIds.length === 0}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Buscar Campanhas
                </button>
            </div>

            {!fetched && overriddenIds.size === 0 && (
                <p className="text-xs text-muted-foreground">
                    Clique em "Buscar Campanhas" para personalizar métricas por campanha. Por padrão, todas usam as métricas globais acima.
                </p>
            )}

            {fetched && campaigns.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma campanha encontrada.</p>
            )}

            <div className="space-y-2">
                {campaigns.map(c => {
                    const overridden = overriddenIds.has(c.id);
                    const expanded   = expandedId === c.id && overridden;
                    return (
                        <div key={c.id} className="border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted">
                                <span className="text-sm text-foreground truncate font-medium flex-1 min-w-0">
                                    {c.name}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {overridden && (
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(expanded ? null : c.id)}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            {expanded ? "Fechar" : "Editar"}
                                        </button>
                                    )}
                                    {overridden ? (
                                        <button
                                            type="button"
                                            onClick={() => removeOverride(c.id)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Resetar
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => enableOverride(c.id)}
                                            className="text-xs border border-border rounded-md px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Personalizar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {expanded && (
                                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-background/30">
                                    {(Object.keys(METRIC_LABELS) as (keyof MultiReportMetrics)[]).map(key => {
                                        const checked = !!value[c.id]?.[key];
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => toggleMetric(c.id, key)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                                                    checked
                                                        ? "bg-primary/10 border-primary/30 text-foreground"
                                                        : "bg-muted border-border text-muted-foreground/50"
                                                )}
                                            >
                                                {checked
                                                    ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                                    : <Square className="w-4 h-4 shrink-0" />}
                                                <span className="text-xs">{METRIC_LABELS[key]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── WhatsApp Text Renderer ────────────────────────────────────────────────────

function parseWhatsAppLine(line: string): React.ReactNode {
    const parts = line.split(/(\*[^*\n]+\*)/g);
    return parts.map((part, j) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2
            ? <strong key={j} className="font-bold">{part.slice(1, -1)}</strong>
            : <span key={j}>{part}</span>
    );
}

function WhatsAppText({ text }: { text: string }) {
    const lines = text.split('\n');
    return (
        <div className="text-sm leading-[1.45] font-sans">
            {lines.map((line, i) => {
                if (/^━{3,}/.test(line)) {
                    return <div key={i} className="border-t border-white/20 my-1.5" />;
                }
                if (line === '') {
                    return <div key={i} className="h-1.5" />;
                }
                return <div key={i}>{parseWhatsAppLine(line)}</div>;
            })}
        </div>
    );
}

// ── Automation Card ───────────────────────────────────────────────────────────

function AutomationCard({
    automation, accounts, onToggle, onEdit, onDelete, onRunNow, globalDisabled, overridePreset,
}: {
    automation: AutomationRecord;
    accounts: MetaAdAccount[];
    onToggle: (enabled: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onRunNow: () => void;
    globalDisabled?: boolean;
    overridePreset?: string;
}) {
    const [running,   setRunning]   = useState(false);
    const [runResult, setRunResult] = useState<{ success: boolean; error?: string } | null>(null);

    const accountNames = (automation.account_ids ?? [])
        .map(id => accounts.find(a => a.id === id)?.name ?? id)
        .slice(0, 3)
        .join(", ");
    const extraAccounts = (automation.account_ids?.length ?? 0) - 3;

    const activeMetrics = Object.entries(automation.metrics_config ?? {})
        .filter(([, v]) => v).length;

    const handleRunNow = async () => {
        setRunning(true);
        setRunResult(null);
        const res = await runAutomationNowAction(automation.id, overridePreset || undefined);
        setRunResult(res);
        setRunning(false);
        if (res.success) onRunNow();
    };

    return (
        <GlassCard className="space-y-4 w-full min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0 mt-1",
                        automation.enabled ? "bg-emerald-400" : "bg-muted-foreground/30"
                    )} />
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground truncate">{automation.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {accountNames}{extraAccounts > 0 && ` +${extraAccounts}`}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={automation.enabled}
                    onCheckedChange={onToggle}
                />
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground w-full min-w-0">
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                    <Clock className="w-3 h-3 shrink-0" /> {automation.schedule_time}
                </span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                    <Zap className="w-3 h-3 shrink-0" /> {getDateLabel(automation.date_preset)}
                </span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                    {activeMetrics} mét.
                </span>
                {automation.skip_weekends && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-amber-400 whitespace-nowrap">
                        Seg–Sex
                    </span>
                )}
                {automation.totals_only && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-primary whitespace-nowrap">
                        Totais
                    </span>
                )}
                {automation.destination_type === "group" && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md min-w-0 max-w-[140px]">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate">{automation.destination_name || "Grupo"}</span>
                    </span>
                )}
                {automation.destination_type === "number" && automation.destination_id && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md min-w-0 max-w-[130px]">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="truncate">{automation.destination_id}</span>
                    </span>
                )}
                {automation.last_sent_at && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                        {new Date(automation.last_sent_at).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                        })}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                    onClick={handleRunNow}
                    disabled={running || globalDisabled}
                    variant="secondary"
                    className="flex-1 h-8 text-xs gap-1.5"
                >
                    {running
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</>
                        : <><Play className="w-3 h-3" /> Enviar Agora</>}
                </Button>
                <button onClick={onEdit}
                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={onDelete}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Excluir">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {runResult && (
                <div className={cn(
                    "text-xs p-2 rounded-lg flex items-center gap-2",
                    runResult.success
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                )}>
                    {runResult.success ? "✓ Relatório enviado!" : `✗ ${runResult.error}`}
                </div>
            )}

        </GlassCard>
    );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function AutomationForm({
    initial, accounts, onSave, onCancel,
}: {
    initial?: AutomationRecord | null;
    accounts: MetaAdAccount[];
    onSave: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<AutomationFormData>(() => initial
        ? {
            name:             initial.name,
            enabled:          initial.enabled,
            account_ids:      initial.account_ids ?? [],
            date_preset:      initial.date_preset,
            schedule_time:    initial.schedule_time,
            metrics_config:   initial.metrics_config   ?? {},
            campaign_metrics: initial.campaign_metrics  ?? {},
            custom_message:   initial.custom_message   ?? "",
            skip_weekends:    initial.skip_weekends    ?? false,
            totals_only:      initial.totals_only      ?? false,
            destination_type: initial.destination_type ?? "default",
            destination_id:   initial.destination_id   ?? "",
            destination_name: initial.destination_name ?? "",
        }
        : { ...EMPTY_FORM, metrics_config: { ...DEFAULT_AUTOMATION_METRICS } as Record<string, boolean> }
    );
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    // ── Live preview ──────────────────────────────────────────────────────────
    const [previewing,  setPreviewing]  = useState(false);
    const [previewText, setPreviewText] = useState<string | null>(null);
    const [previewErr,  setPreviewErr]  = useState<string | null>(null);

    // Reload preview whenever key form fields change (only for existing automations)
    useEffect(() => {
        if (!initial) return; // no preview for unsaved automations
        let cancelled = false;
        setPreviewing(true);
        setPreviewText(null);
        setPreviewErr(null);
        previewAutomationAction(initial.id).then(res => {
            if (cancelled) return;
            if (res.success && res.message) setPreviewText(res.message);
            else setPreviewErr(res.error ?? 'Erro ao carregar');
            setPreviewing(false);
        });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id, form.date_preset, form.metrics_config, form.campaign_metrics, form.totals_only]);

    const toggleAccount = (id: string) => {
        setForm(f => ({
            ...f,
            account_ids: f.account_ids.includes(id)
                ? f.account_ids.filter(a => a !== id)
                : [...f.account_ids, id],
        }));
    };

    const toggleMetric = (key: string) => {
        setForm(f => ({
            ...f,
            metrics_config: { ...f.metrics_config, [key]: !f.metrics_config[key] },
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim())              return setError("Dê um nome à automação.");
        if (form.account_ids.length === 0)  return setError("Selecione ao menos uma conta.");
        setSaving(true);
        setError(null);
        const res = initial
            ? await updateAutomationAction(initial.id, form)
            : await createAutomationAction(form);
        setSaving(false);
        if (res.success) { onSave(); }
        else setError(res.error ?? "Erro ao salvar.");
    };

    return (
        <div className="space-y-6">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Voltar às Automações
            </button>

            <GlassCard className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">
                    {initial ? "Editar Automação" : "Nova Automação"}
                </h2>

                {/* Name + schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Nome
                        </label>
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Ex: Relatório Dr. Marcone"
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Horário
                        </label>
                        <input
                            type="time"
                            value={form.schedule_time}
                            onChange={e => setForm(f => ({ ...f, schedule_time: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Período
                        </label>
                        <select
                            value={form.date_preset}
                            onChange={e => setForm(f => ({ ...f, date_preset: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            {DATE_PRESETS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Skip weekends */}
                <button
                    type="button"
                    onClick={() => setForm((f: AutomationFormData) => ({ ...f, skip_weekends: !f.skip_weekends }))}
                    className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left",
                        form.skip_weekends
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-muted border-border text-muted-foreground"
                    )}
                >
                    {form.skip_weekends
                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        : <Square className="w-4 h-4 shrink-0" />}
                    <div>
                        <p className="text-sm font-medium">Pular fins de semana</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Sábado e domingo não enviam. Na segunda-feira puxa métricas de sexta a domingo.
                        </p>
                    </div>
                </button>

                {/* Totals only */}
                <button
                    type="button"
                    onClick={() => setForm((f: AutomationFormData) => ({ ...f, totals_only: !f.totals_only }))}
                    className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left",
                        form.totals_only
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-muted border-border text-muted-foreground"
                    )}
                >
                    {form.totals_only
                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        : <Square className="w-4 h-4 shrink-0" />}
                    <div>
                        <p className="text-sm font-medium">Somente totais</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Envia apenas o resumo combinado de todas as campanhas, sem detalhamento por campanha.
                        </p>
                    </div>
                </button>

                {/* Accounts */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Contas de Anúncios
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {accounts.map(account => {
                            const checked = form.account_ids.includes(account.id);
                            return (
                                <button
                                    key={account.id}
                                    onClick={() => toggleAccount(account.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all",
                                        checked
                                            ? "bg-primary/10 border-primary/30 text-foreground"
                                            : "bg-muted border-border text-muted-foreground/60 hover:text-foreground"
                                    )}
                                >
                                    {checked
                                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                        : <Square className="w-4 h-4 shrink-0" />}
                                    <span className="truncate">{account.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Métricas a Incluir
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(Object.keys(METRIC_LABELS) as (keyof MultiReportMetrics)[]).map(key => {
                            const checked = !!form.metrics_config[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleMetric(key)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                        checked
                                            ? "bg-primary/10 border-primary/30 text-foreground"
                                            : "bg-muted border-border text-muted-foreground/50"
                                    )}
                                >
                                    {checked
                                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                        : <Square className="w-4 h-4 shrink-0" />}
                                    <span className="text-xs">{METRIC_LABELS[key]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Per-campaign metrics */}
                <CampaignMetricsPicker
                    accountIds={form.account_ids}
                    globalMetrics={form.metrics_config}
                    value={form.campaign_metrics}
                    onChange={v => setForm((f: AutomationFormData) => ({ ...f, campaign_metrics: v }))}
                />

                {/* Custom message */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Mensagem de Saudação (opcional)
                    </label>
                    <textarea
                        value={form.custom_message}
                        onChange={e => setForm(f => ({ ...f, custom_message: e.target.value }))}
                        placeholder="Bom dia! Segue o relatório de hoje..."
                        rows={3}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
                    />
                </div>

                {/* Destination */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Destino do Relatório
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {([
                            { value: "default", label: "Número padrão",      icon: <Phone className="w-4 h-4 shrink-0" /> },
                            { value: "number",  label: "Número específico",   icon: <Phone className="w-4 h-4 shrink-0" /> },
                            { value: "group",   label: "Grupo do WhatsApp",   icon: <Users className="w-4 h-4 shrink-0" /> },
                        ] as const).map(opt => {
                            const checked = form.destination_type === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, destination_type: opt.value, destination_id: "", destination_name: "" }))}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all",
                                        checked
                                            ? "bg-primary/10 border-primary/30 text-foreground"
                                            : "bg-muted border-border text-muted-foreground/60 hover:text-foreground"
                                    )}
                                >
                                    {checked
                                        ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                        : <Square className="w-4 h-4 shrink-0" />}
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {form.destination_type === "number" && (
                        <input
                            value={form.destination_id}
                            onChange={e => setForm(f => ({ ...f, destination_id: e.target.value }))}
                            placeholder="5511999999999 (com DDI, sem espaços)"
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    )}

                    {form.destination_type === "group" && (
                        <GroupPicker
                            value={form.destination_id}
                            name={form.destination_name}
                            onChange={(id, label) => setForm(f => ({ ...f, destination_id: id, destination_name: label }))}
                        />
                    )}
                </div>

                {/* Live preview — only shown when editing an existing automation */}
                {initial && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Eye className="w-3 h-3" /> Pré-visualização
                        </span>

                        {/* WhatsApp-style chat background */}
                        <div className="rounded-2xl overflow-hidden bg-[#0b141a] p-4 min-h-[80px]">
                            {previewing && (
                                <div className="flex items-center gap-2 text-[#8696a0] text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Buscando dados reais…
                                </div>
                            )}
                            {previewErr && !previewing && (
                                <p className="text-sm text-red-400">{previewErr}</p>
                            )}
                            {previewText && !previewing && (
                                <div className="flex justify-end">
                                    {/* Sent message bubble */}
                                    <div className="relative max-w-[85%] bg-[#005c4b] text-white rounded-2xl rounded-tr-sm px-3 pt-2 pb-5 shadow-md">
                                        <WhatsAppText text={previewText} />
                                        {/* Timestamp */}
                                        <span className="absolute bottom-1.5 right-2.5 text-[10px] text-[#8696a0] whitespace-nowrap">
                                            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-2">
                    <Button onClick={onCancel} variant="secondary" className="flex-1">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving} variant="primary" className="flex-1">
                        {saving
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>
                            : initial ? "Salvar Alterações" : "Criar Automação"}
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
}

// ── WaBlast Components ────────────────────────────────────────────────────────

const DAYS_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EMPTY_WA_BLAST: WaBlastFormData = {
    name: "",
    enabled: true,
    schedule_days: [1, 2, 3, 4, 5], // Seg-Sex by default
    schedule_time: "09:00",
    messages: [""],
    destination_type: "number",
    destination_id: "",
    destination_name: "",
};

function WaBlastCard({
    blast,
    onToggle,
    onEdit,
    onDelete,
    onRunNow,
}: {
    blast: WaBlastRecord;
    onToggle: (enabled: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onRunNow: () => void;
}) {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; sent: number } | null>(null);

    async function handleRun() {
        setRunning(true);
        setResult(null);
        const r = await runWaBlastNowAction(blast.id);
        setResult(r);
        setRunning(false);
        onRunNow();
    }

    const daysLabel = blast.schedule_days.sort().map(d => DAYS_LABELS[d]).join(", ");

    return (
        <GlassCard className="space-y-4 w-full min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground truncate">{blast.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {blast.messages.length} mensagem{blast.messages.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Switch checked={blast.enabled} onCheckedChange={onToggle} />
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground w-full min-w-0">
                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {blast.schedule_time}
                </span>
                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                    <Calendar className="w-3 h-3" /> {daysLabel}
                </span>
                {blast.destination_type === "group" ? (
                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md max-w-[160px] truncate">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate">{blast.destination_name || blast.destination_id || "Grupo"}</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md max-w-[160px] truncate">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="truncate">{blast.destination_id || "Número"}</span>
                    </span>
                )}
            </div>

            {blast.last_sent_at && (
                <p className="text-xs text-muted-foreground">
                    Último envio: {new Date(blast.last_sent_at).toLocaleString("pt-BR")}
                </p>
            )}

            {result && (
                <p className={cn("text-xs", result.success ? "text-emerald-400" : "text-red-400")}>
                    {result.success ? `✓ ${result.sent} mensagem(s) enviada(s)` : "Falha no envio"}
                </p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <button onClick={onEdit} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Editar">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="text-muted-foreground hover:text-red-400 transition-colors p-1" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                <Button
                    onClick={handleRun}
                    disabled={running}
                    variant="secondary"
                    className="flex items-center gap-1.5 text-xs h-8 px-3"
                >
                    {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Enviar agora
                </Button>
            </div>
        </GlassCard>
    );
}

function WaBlastForm({
    initial,
    waConfigured,
    onSave,
    onCancel,
}: {
    initial: WaBlastRecord | null;
    waConfigured: boolean;
    onSave: () => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<WaBlastFormData>(
        initial
            ? {
                name: initial.name,
                enabled: initial.enabled,
                schedule_days: initial.schedule_days,
                schedule_time: initial.schedule_time,
                messages: initial.messages.length > 0 ? initial.messages : [""],
                destination_type: initial.destination_type,
                destination_id: initial.destination_id ?? "",
                destination_name: initial.destination_name ?? "",
            }
            : { ...EMPTY_WA_BLAST }
    );
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    async function loadGroups() {
        setLoadingGroups(true);
        const res = await listGroupsAction();
        setGroups(res.groups ?? []);
        setLoadingGroups(false);
    }

    function toggleDay(day: number) {
        setForm(prev => ({
            ...prev,
            schedule_days: prev.schedule_days.includes(day)
                ? prev.schedule_days.filter(d => d !== day)
                : [...prev.schedule_days, day].sort(),
        }));
    }

    function setMessage(index: number, value: string) {
        setForm(prev => {
            const msgs = [...prev.messages];
            msgs[index] = value;
            return { ...prev, messages: msgs };
        });
    }

    function addMessage() {
        setForm(prev => ({ ...prev, messages: [...prev.messages, ""] }));
    }

    function removeMessage(index: number) {
        setForm(prev => ({ ...prev, messages: prev.messages.filter((_, i) => i !== index) }));
    }

    async function handleSave() {
        if (!form.name.trim()) return;
        if (form.schedule_days.length === 0) return;
        if (!form.destination_id.trim()) return;
        setSaving(true);
        if (initial) {
            await updateWaBlastAutomationAction(initial.id, form);
        } else {
            await createWaBlastAutomationAction(form);
        }
        setSaving(false);
        onSave();
    }

    return (
        <GlassCard className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-foreground">{initial ? "Editar" : "Nova"} Automação de Mensagens</h2>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Boas-vindas semanais"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Schedule */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Agendamento</label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_LABELS.map((label, i) => (
                        <button
                            key={i}
                            onClick={() => toggleDay(i)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                form.schedule_days.includes(i)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <input
                    type="time"
                    value={form.schedule_time}
                    onChange={e => setForm(p => ({ ...p, schedule_time: e.target.value }))}
                    className="w-40 px-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Destination */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Destino</label>
                <div className="flex gap-3">
                    {(["number", "group"] as const).map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="dest_type"
                                checked={form.destination_type === type}
                                onChange={() => setForm(p => ({ ...p, destination_type: type, destination_id: "", destination_name: "" }))}
                                className="accent-primary"
                            />
                            <span className="text-sm text-foreground">{type === "number" ? "Número" : "Grupo"}</span>
                        </label>
                    ))}
                </div>

                {form.destination_type === "number" ? (
                    <input
                        value={form.destination_id}
                        onChange={e => setForm(p => ({ ...p, destination_id: e.target.value }))}
                        placeholder="5511999999999"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                ) : (
                    <div className="space-y-2">
                        <Button
                            onClick={loadGroups}
                            disabled={loadingGroups || !waConfigured}
                            variant="outline"
                            className="text-xs h-8"
                        >
                            {loadingGroups ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                            {loadingGroups ? "Carregando..." : "Carregar grupos"}
                        </Button>
                        {!waConfigured && <p className="text-xs text-amber-400">Configure o WhatsApp nas Configurações primeiro.</p>}
                        {groups.length > 0 && (
                            <select
                                value={form.destination_id}
                                onChange={e => {
                                    const g = groups.find(g => g.id === e.target.value);
                                    setForm(p => ({ ...p, destination_id: e.target.value, destination_name: g?.name ?? "" }));
                                }}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">Selecione um grupo</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        )}
                        {form.destination_id && (
                            <p className="text-xs text-muted-foreground truncate">{form.destination_name || form.destination_id}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Mensagens</label>
                <p className="text-xs text-muted-foreground">As mensagens são enviadas em sequência, com 1 segundo de intervalo.</p>
                {form.messages.map((msg, i) => (
                    <div key={i} className="relative">
                        <textarea
                            value={msg}
                            onChange={e => setMessage(i, e.target.value)}
                            placeholder={`Mensagem ${i + 1}…`}
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none pr-8"
                        />
                        {form.messages.length > 1 && (
                            <button
                                onClick={() => removeMessage(i)}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                <Button onClick={addMessage} variant="outline" className="text-xs h-8 flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Adicionar mensagem
                </Button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
                <Button onClick={onCancel} variant="outline" className="text-sm">Cancelar</Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim() || form.schedule_days.length === 0 || !form.destination_id.trim()}
                    variant="primary"
                    className="flex items-center gap-2 text-sm"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {initial ? "Salvar" : "Criar"}
                </Button>
            </div>
        </GlassCard>
    );
}

function WaBlastSection({ waConfigured }: { waConfigured: boolean }) {
    const [blasts, setBlasts] = useState<WaBlastRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<WaBlastRecord | null | "new">(null);

    async function loadBlasts() {
        setLoading(true);
        setBlasts(await listWaBlastAutomationsAction());
        setLoading(false);
    }

    useEffect(() => { loadBlasts(); }, []);

    async function handleToggle(id: string, enabled: boolean) {
        await toggleWaBlastAutomationAction(id, enabled);
        setBlasts(prev => prev.map(b => b.id === id ? { ...b, enabled } : b));
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta automação?")) return;
        await deleteWaBlastAutomationAction(id);
        setBlasts(prev => prev.filter(b => b.id !== id));
    }

    if (editing !== null) {
        return (
            <WaBlastForm
                initial={editing === "new" ? null : editing}
                waConfigured={waConfigured}
                onSave={() => { setEditing(null); loadBlasts(); }}
                onCancel={() => setEditing(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Envie mensagens automáticas para clientes em dias e horários configurados.
                </p>
                <Button onClick={() => setEditing("new")} variant="primary" className="flex items-center gap-2 text-sm shrink-0">
                    <Plus className="w-4 h-4" /> Nova
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : blasts.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-primary opacity-60" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Nenhuma automação criada</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        Crie automações semanais para enviar mensagens automáticas para seus clientes.
                    </p>
                    <Button onClick={() => setEditing("new")} variant="primary" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Criar Primeira Automação
                    </Button>
                </GlassCard>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {blasts.map(blast => (
                        <WaBlastCard
                            key={blast.id}
                            blast={blast}
                            onToggle={enabled => handleToggle(blast.id, enabled)}
                            onEdit={() => setEditing(blast)}
                            onDelete={() => handleDelete(blast.id)}
                            onRunNow={loadBlasts}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type View = { type: "list" } | { type: "form"; editing: AutomationRecord | null };

type SendAllStatus = {
    running: boolean;
    current: number;
    total: number;
    results: { name: string; success: boolean }[];
};

export default function AutomationsPage() {
    const [activeTab, setActiveTab] = useState<"reports" | "disparo">("reports");
    const [automations, setAutomations] = useState<AutomationRecord[]>([]);
    const [accounts, setAccounts]       = useState<MetaAdAccount[]>([]);
    const [loading, setLoading]         = useState(true);
    const [waConfigured, setWaConfigured] = useState(false);
    const [waConnected, setWaConnected]   = useState(false);
    const [view, setView] = useState<View>({ type: "list" });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sendAll, setSendAll] = useState<SendAllStatus | null>(null);
    const [overridePreset, setOverridePreset] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem("automations_override_preset") ?? "";
    });
    const [savingPreset, setSavingPreset] = useState(false);

    function handleOverridePresetChange(value: string) {
        setOverridePreset(value);
        localStorage.setItem("automations_override_preset", value);
    }

    async function handleSavePresetForAll() {
        if (!overridePreset) return;
        setSavingPreset(true);
        await bulkUpdateDatePresetAction(overridePreset);
        await loadData();
        setSavingPreset(false);
    }

    useEffect(() => {
        Promise.all([loadData(), checkWA()]);
    }, []);

    async function loadData() {
        setLoading(true);
        const [autos, accs] = await Promise.all([
            listAutomationsAction(),
            fetchAdAccountsAction(),
        ]);
        setAutomations(autos);
        setAccounts(accs);
        setLoading(false);
    }

    async function checkWA() {
        const s = await getUazAPIStatusAction();
        setWaConfigured(s.configured);
        setWaConnected(s.connected && s.loggedIn);
    }

    async function handleToggle(id: string, enabled: boolean) {
        await toggleAutomationAction(id, enabled);
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta automação?")) return;
        setDeletingId(id);
        await deleteAutomationAction(id);
        setAutomations(prev => prev.filter(a => a.id !== id));
        setDeletingId(null);
    }

    async function handleSendAll() {
        const enabled = automations.filter(a => a.enabled);
        if (enabled.length === 0) return;
        setSendAll({ running: true, current: 0, total: enabled.length, results: [] });
        for (let i = 0; i < enabled.length; i++) {
            const auto = enabled[i];
            setSendAll(prev => prev ? { ...prev, current: i + 1 } : prev);
            const res = await runAutomationNowAction(auto.id, overridePreset || undefined);
            setSendAll(prev => prev ? {
                ...prev,
                results: [...prev.results, { name: auto.name, success: res.success }],
            } : prev);
            // After every 2 sends, wait 30s before the next batch (unless it's the last)
            const isLastInBatch = (i + 1) % 2 === 0;
            if (isLastInBatch && i < enabled.length - 1) {
                await new Promise(r => setTimeout(r, 30_000));
            }
        }
        setSendAll(prev => prev ? { ...prev, running: false } : prev);
        await loadData();
    }

    async function handleSaved() {
        setView({ type: "list" });
        await loadData();
    }

    if (view.type === "form") {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Automações</h1>
                </div>
                <AutomationForm
                    initial={view.editing}
                    accounts={accounts}
                    onSave={handleSaved}
                    onCancel={() => setView({ type: "list" })}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Automações</h1>
                    <p className="text-sm text-muted-foreground">
                        {activeTab === "reports"
                            ? "Configure relatórios automáticos multi-conta enviados via WhatsApp."
                            : "Envie mensagens automáticas para clientes em dias configurados."}
                    </p>
                </div>
                {activeTab === "reports" && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                        {automations.filter(a => a.enabled).length > 0 && (
                            <>
                                <select
                                    value={overridePreset}
                                    onChange={e => handleOverridePresetChange(e.target.value)}
                                    disabled={!!sendAll?.running || savingPreset}
                                    title="Período de envio"
                                    className="h-9 px-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                                >
                                    <option value="">Período original</option>
                                    {DATE_PRESETS.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                                {overridePreset && (
                                    <Button
                                        onClick={handleSavePresetForAll}
                                        disabled={savingPreset || !!sendAll?.running}
                                        variant="outline"
                                        className="flex items-center gap-2 text-xs h-9"
                                    >
                                        {savingPreset
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : "Salvar em Todas"}
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSendAll}
                                    disabled={!!sendAll?.running || loading}
                                    variant="secondary"
                                    className="flex items-center gap-2 text-sm"
                                >
                                    {sendAll?.running
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {sendAll.current}/{sendAll.total}</>
                                        : <><Send className="w-4 h-4" /> Enviar Todos</>}
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={() => setView({ type: "form", editing: null })}
                            variant="primary"
                            className="flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" /> Nova
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
                {([
                    { id: "reports", label: "Relatórios", icon: Zap },
                    { id: "disparo", label: "Disparo WhatsApp", icon: MessageCircle },
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === tab.id
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === "reports" ? (
                <>
                    {/* Send All progress */}
                    {sendAll && (
                        <GlassCard className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">
                                    {sendAll.running
                                        ? `Enviando ${sendAll.current} de ${sendAll.total}…`
                                        : `Envio concluído — ${sendAll.results.filter(r => r.success).length}/${sendAll.total} enviados`}
                                </p>
                                {!sendAll.running && (
                                    <button
                                        onClick={() => setSendAll(null)}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Fechar
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sendAll.results.map((r, i) => (
                                    <span key={i} className={cn(
                                        "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                                        r.success
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400"
                                    )}>
                                        {r.success ? "✓" : "✗"} {r.name}
                                    </span>
                                ))}
                                {sendAll.running && sendAll.current <= sendAll.total && (
                                    <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {automations.filter(a => a.enabled)[sendAll.current - 1]?.name ?? "…"}
                                    </span>
                                )}
                            </div>
                        </GlassCard>
                    )}
                    {/* Automation list */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : automations.length === 0 ? (
                        <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="w-8 h-8 text-primary opacity-60" />
                            </div>
                            <h3 className="font-bold text-foreground mb-2">Nenhuma automação criada</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                Crie sua primeira automação para enviar relatórios combinados de múltiplas contas automaticamente.
                            </p>
                            <Button
                                onClick={() => setView({ type: "form", editing: null })}
                                variant="primary"
                                className="flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Criar Primeira Automação
                            </Button>
                        </GlassCard>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {automations.map(automation => (
                                <AutomationCard
                                    key={automation.id}
                                    automation={automation}
                                    accounts={accounts}
                                    onToggle={enabled => handleToggle(automation.id, enabled)}
                                    onEdit={() => setView({ type: "form", editing: automation })}
                                    onDelete={() => handleDelete(automation.id)}
                                    onRunNow={loadData}
                                    globalDisabled={!!sendAll?.running}
                                    overridePreset={overridePreset || undefined}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <WaBlastSection waConfigured={waConfigured} />
            )}

        </div>
    );
}
