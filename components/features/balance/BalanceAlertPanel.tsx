'use client';

import { useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import {
    getBalanceAlertSettingsAction,
    saveAccountAlertAction,
    saveBalanceAlertGroupAction,
    runBalanceCheckNowAction,
    type AccountAlertConfig,
} from '@/actions/balance-alert-actions';
import { listGroupsAction } from '@/actions/uazapi-actions';
import {
    Bell, BellOff, RefreshCw, Loader2, CheckCircle2,
    XCircle, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Group Selector ────────────────────────────────────────────────────────────

interface GroupSelectorProps {
    selectedId:   string | null;
    selectedName: string | null;
    onChange:     (id: string, name: string) => void;
}

function GroupSelector({ selectedId, selectedName, onChange }: GroupSelectorProps) {
    const [groups, setGroups]       = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading]     = useState(false);
    const [open, setOpen]           = useState(false);
    const [error, setError]         = useState<string | null>(null);

    const loadGroups = async () => {
        setLoading(true);
        setError(null);
        const res = await listGroupsAction();
        if (res.error) {
            setError(res.error);
        } else {
            setGroups(res.groups.map(g => ({ id: g.id, name: g.name })));
            setOpen(true);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Grupo WhatsApp para Alertas
            </label>
            <div className="flex gap-2">
                <div className="flex-1 flex items-center h-9 px-3 rounded-lg border border-border bg-background/50 text-sm">
                    {selectedName
                        ? <span className="text-foreground">{selectedName}</span>
                        : <span className="text-muted-foreground">Nenhum grupo selecionado</span>}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadGroups}
                    disabled={loading}
                    className="shrink-0"
                >
                    {loading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Selecionar</>}
                </Button>
            </div>

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            {open && groups.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden bg-background shadow-lg max-h-48 overflow-y-auto">
                    {groups.map(g => (
                        <button
                            key={g.id}
                            onClick={() => { onChange(g.id, g.name); setOpen(false); }}
                            className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                                selectedId === g.id && 'bg-primary/10 text-primary font-medium',
                            )}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground">
                Os alertas serão enviados para este grupo interno. Certifique-se de que a instância WhatsApp está no grupo.
            </p>
        </div>
    );
}

// ── Account Row ───────────────────────────────────────────────────────────────

interface AccountRowProps {
    account:  AccountAlertConfig;
    onChange: (accountId: string, enabled: boolean, threshold: number) => Promise<void>;
}

function AccountRow({ account, onChange }: AccountRowProps) {
    const [enabled,   setEnabled]   = useState(account.alertEnabled);
    const [threshold, setThreshold] = useState(String(account.alertThreshold));
    const [saving,    setSaving]    = useState(false);

    const handleToggle = async (val: boolean) => {
        setEnabled(val);
        setSaving(true);
        await onChange(account.accountId, val, parseFloat(threshold) || 200);
        setSaving(false);
    };

    const handleThresholdBlur = async () => {
        if (!enabled) return;
        setSaving(true);
        await onChange(account.accountId, enabled, parseFloat(threshold) || 200);
        setSaving(false);
    };

    const fmtDate = (iso: string | null) => {
        if (!iso) return null;
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        });
    };

    return (
        <div className={cn(
            'flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors',
            enabled
                ? 'border-primary/20 bg-primary/5'
                : 'border-border bg-background/30',
            !account.isPrepay && 'opacity-60',
        )}>
            {/* Account name + payment type */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate">
                        {account.accountName}
                    </span>
                    <Badge
                        variant={account.isPrepay ? 'success' : 'neutral'}
                        className="text-[10px] shrink-0"
                    >
                        {account.paymentLabel}
                    </Badge>
                </div>
                {account.alertLastSentAt && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Último alerta: {fmtDate(account.alertLastSentAt)}
                    </p>
                )}
                {!account.isPrepay && (
                    <p className="text-[11px] text-amber-400/80 mt-0.5">
                        Cobrança automática — alerta de saldo não aplicável
                    </p>
                )}
            </div>

            {/* Threshold input (only visible when enabled & prepay) */}
            {account.isPrepay && enabled && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                        type="number"
                        min="0"
                        step="50"
                        value={threshold}
                        onChange={e => setThreshold(e.target.value)}
                        onBlur={handleThresholdBlur}
                        className="w-24 h-8 text-sm"
                    />
                </div>
            )}

            {/* Toggle */}
            {account.isPrepay ? (
                <div className="flex items-center gap-2 shrink-0">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
                </div>
            ) : (
                <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
        </div>
    );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function BalanceAlertPanel() {
    const [settings, setSettings] = useState<Awaited<ReturnType<typeof getBalanceAlertSettingsAction>>>(null);
    const [loading,  setLoading]  = useState(true);
    const [groupId,   setGroupId]   = useState<string | null>(null);
    const [groupName, setGroupName] = useState<string | null>(null);
    const [savingGroup, setSavingGroup] = useState(false);
    const [groupResult, setGroupResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [checking,    setChecking]    = useState(false);
    const [checkResult, setCheckResult] = useState<{ alerted: number; checked: number } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await getBalanceAlertSettingsAction();
        setSettings(data);
        if (data) {
            setGroupId(data.groupId);
            setGroupName(data.groupName);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleGroupChange = (id: string, name: string) => {
        setGroupId(id);
        setGroupName(name);
    };

    const handleSaveGroup = async () => {
        setSavingGroup(true);
        setGroupResult(null);
        const res = await saveBalanceAlertGroupAction(groupId, groupName);
        setGroupResult(res);
        setSavingGroup(false);
    };

    const handleAccountChange = async (accountId: string, enabled: boolean, threshold: number) => {
        await saveAccountAlertAction(accountId, enabled, threshold);
    };

    const handleCheckNow = async () => {
        setChecking(true);
        setCheckResult(null);
        const res = await runBalanceCheckNowAction();
        setCheckResult({ alerted: res.alerted, checked: res.checked });
        setChecking(false);
        load(); // refresh last sent timestamps
    };

    if (loading) {
        return (
            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-bold">Alertas de Saldo</h3>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </GlassCard>
        );
    }

    const enabledCount = settings?.accounts.filter(a => a.alertEnabled).length ?? 0;

    return (
        <GlassCard className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-foreground">Alertas de Saldo</h3>
                    {enabledCount > 0 && (
                        <Badge variant="warning" className="text-[11px]">
                            {enabledCount} ativo{enabledCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCheckNow}
                        disabled={checking || !groupId}
                        title="Verificar saldos agora e enviar alertas pendentes"
                    >
                        {checking
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando…</>
                            : <><RefreshCw className="h-4 w-4 mr-2" />Verificar Agora</>}
                    </Button>
                </div>
            </div>

            {/* Check result */}
            {checkResult && (
                <div className={cn(
                    'flex items-center gap-2 text-sm p-3 rounded-lg',
                    checkResult.alerted > 0
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                )}>
                    {checkResult.alerted > 0
                        ? <><AlertTriangle className="h-4 w-4 shrink-0" />
                            {checkResult.alerted} alerta{checkResult.alerted !== 1 ? 's' : ''} enviado{checkResult.alerted !== 1 ? 's' : ''} de {checkResult.checked} conta{checkResult.checked !== 1 ? 's' : ''} verificada{checkResult.checked !== 1 ? 's' : ''}.</>
                        : <><CheckCircle2 className="h-4 w-4 shrink-0" />
                            Todas as {checkResult.checked} conta{checkResult.checked !== 1 ? 's' : ''} verificada{checkResult.checked !== 1 ? 's' : ''} — saldo OK.</>}
                </div>
            )}

            {/* Group selector */}
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-border">
                <GroupSelector
                    selectedId={groupId}
                    selectedName={groupName}
                    onChange={handleGroupChange}
                />
                <div className="flex items-center gap-2 pt-1">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveGroup}
                        disabled={savingGroup}
                    >
                        {savingGroup
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</>
                            : 'Salvar Grupo'}
                    </Button>
                    {groupResult && (
                        <span className={cn('text-xs', groupResult.success ? 'text-emerald-400' : 'text-red-400')}>
                            {groupResult.success ? 'Salvo!' : groupResult.error}
                        </span>
                    )}
                </div>
            </div>

            {/* Per-account configuration */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Contas — Limite de Saldo
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        Alerta quando saldo ≤ limite (a cada 4h)
                    </p>
                </div>

                {!settings?.accounts.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhuma conta encontrada.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {settings.accounts.map(account => (
                            <AccountRow
                                key={account.accountId}
                                account={account}
                                onChange={handleAccountChange}
                            />
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
