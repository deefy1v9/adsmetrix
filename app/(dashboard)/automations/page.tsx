"use client";

import { useEffect, useState } from "react";
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
    AutomationRecord,
    AutomationFormData,
} from "@/actions/automation-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import {
    Loader2, Plus, Wifi, WifiOff, MessageSquare, Pencil, Trash2,
    Play, ArrowLeft, CheckSquare, Square, Terminal, Clock, Zap, Search,
    Phone, Users,
} from "lucide-react";
import { MetaAdAccount } from "@/lib/meta-api";
import {
    METRIC_LABELS, DEFAULT_AUTOMATION_METRICS, MultiReportMetrics, getDateLabel,
} from "@/lib/multi-report-builder";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
    { value: "yesterday",  label: "Ontem" },
    { value: "today",      label: "Hoje" },
    { value: "last_7d",    label: "Últimos 7 dias" },
    { value: "last_30d",   label: "Últimos 30 dias" },
    { value: "this_month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
];

const EMPTY_FORM: AutomationFormData = {
    name:             "",
    enabled:          true,
    account_ids:      [],
    date_preset:      "yesterday",
    schedule_time:    "09:00",
    metrics_config:   { ...DEFAULT_AUTOMATION_METRICS } as Record<string, boolean>,
    custom_message:   "",
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
        const result = await listGroupsAction();
        if (result.length === 0) setError("Nenhum grupo encontrado. Verifique se o WhatsApp está conectado.");
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

// ── Automation Card ───────────────────────────────────────────────────────────

function AutomationCard({
    automation, accounts, onToggle, onEdit, onDelete, onRunNow,
}: {
    automation: AutomationRecord;
    accounts: MetaAdAccount[];
    onToggle: (enabled: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onRunNow: () => void;
}) {
    const [running, setRunning] = useState(false);
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
        const res = await runAutomationNowAction(automation.id);
        setRunResult(res);
        setRunning(false);
        if (res.success) onRunNow();
    };

    return (
        <GlassCard className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0 mt-1",
                        automation.enabled ? "bg-emerald-400" : "bg-muted-foreground/30"
                    )} />
                    <div className="min-w-0">
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

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Clock className="w-3 h-3" /> {automation.schedule_time} todo dia
                </span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Zap className="w-3 h-3" /> {getDateLabel(automation.date_preset)}
                </span>
                <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    {activeMetrics} métricas
                </span>
                {automation.destination_type === "group" && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <Users className="w-3 h-3" />
                        {automation.destination_name || "Grupo"}
                    </span>
                )}
                {automation.destination_type === "number" && automation.destination_id && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <Phone className="w-3 h-3" /> {automation.destination_id}
                    </span>
                )}
                {automation.last_sent_at && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        Último envio: {new Date(automation.last_sent_at).toLocaleString("pt-BR", {
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
                    disabled={running}
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
            metrics_config:   initial.metrics_config ?? {},
            custom_message:   initial.custom_message ?? "",
            destination_type: initial.destination_type ?? "default",
            destination_id:   initial.destination_id   ?? "",
            destination_name: initial.destination_name ?? "",
        }
        : { ...EMPTY_FORM, metrics_config: { ...DEFAULT_AUTOMATION_METRICS } as Record<string, boolean> }
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

// ── Page ──────────────────────────────────────────────────────────────────────

type View = { type: "list" } | { type: "form"; editing: AutomationRecord | null };

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<AutomationRecord[]>([]);
    const [accounts, setAccounts]       = useState<MetaAdAccount[]>([]);
    const [loading, setLoading]         = useState(true);
    const [waConfigured, setWaConfigured] = useState(false);
    const [waConnected, setWaConnected]   = useState(false);
    const [view, setView] = useState<View>({ type: "list" });
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    async function handleSaved() {
        setView({ type: "list" });
        await loadData();
    }

    if (view.type === "form") {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Automações</h1>
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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Automações</h1>
                    <p className="text-muted-foreground">
                        Configure relatórios automáticos multi-conta enviados via WhatsApp.
                    </p>
                </div>
                <Button
                    onClick={() => setView({ type: "form", editing: null })}
                    variant="primary"
                    className="flex items-center gap-2 shrink-0"
                >
                    <Plus className="w-4 h-4" /> Nova Automação
                </Button>
            </div>

            {/* WA status banner */}
            <div>
                {waConnected ? (
                    <div className="inline-flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                        <Wifi className="h-4 w-4" /> WhatsApp conectado — envios automáticos ativos
                    </div>
                ) : waConfigured ? (
                    <div className="inline-flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                        <WifiOff className="h-4 w-4" />
                        WhatsApp desconectado —{" "}
                        <Link href="/whatsapp-reports" className="underline underline-offset-2 hover:text-amber-300">
                            reconectar
                        </Link>
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp não configurado —{" "}
                        <Link href="/whatsapp-reports" className="underline underline-offset-2 hover:text-foreground">
                            configurar agora
                        </Link>
                    </div>
                )}
            </div>

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
                        />
                    ))}
                </div>
            )}

            {/* Cron instructions */}
            <GlassCard>
                <div className="p-6 space-y-5">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Clock className="text-primary" /> Como Agendar o Disparo
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Configure um <strong className="text-foreground">cron job</strong> na sua VPS para disparar automaticamente no horário configurado em cada automação.
                    </p>
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Crontab — verificar e disparar a cada minuto
                        </p>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-emerald-400 overflow-x-auto whitespace-pre">
{`* * * * * curl -s "https://SEU_DOMINIO/api/cron/daily-reports?token=SEU_CRON_SECRET"`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            O sistema verifica o horário de cada automação e envia apenas no momento correto, sem duplicação.
                            Substitua <code className="text-primary">SEU_DOMINIO</code> e <code className="text-primary">SEU_CRON_SECRET</code> pelos valores do seu <code className="text-primary">.env</code>.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Testar manualmente</p>
                        <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-primary overflow-x-auto">
                            <Terminal className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <code>GET /api/cron/daily-reports?token=SEU_CRON_SECRET</code>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
