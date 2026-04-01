'use client';

import { useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
    listAutomationsAction,
    sendCustomBroadcastAction,
    type AutomationRecord,
} from '@/actions/automation-actions';
import {
    Send, Loader2, CheckCircle2, XCircle, Users, Hash,
    Phone, MessageSquare, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Destination label ─────────────────────────────────────────────────────────

function DestinationBadge({ automation }: { automation: AutomationRecord }) {
    if (automation.destination_type === 'group' && automation.destination_name) {
        return (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {automation.destination_name}
            </span>
        );
    }
    if (automation.destination_type === 'number' && automation.destination_id) {
        return (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Phone className="h-3 w-3" />
                {automation.destination_id}
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            Número padrão
        </span>
    );
}

// ── Automation row ────────────────────────────────────────────────────────────

interface RowProps {
    automation: AutomationRecord;
    selected:   boolean;
    onToggle:   () => void;
    result?:    { success: boolean; error?: string };
}

function AutomationRow({ automation, selected, onToggle, result }: RowProps) {
    const hasDestination =
        automation.destination_type === 'group' ||
        automation.destination_type === 'number' ||
        automation.destination_type === 'default';

    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={!hasDestination}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                selected
                    ? 'border-primary/40 bg-primary/8'
                    : 'border-border bg-background/30 hover:bg-white/5',
                !hasDestination && 'opacity-40 cursor-not-allowed',
            )}
        >
            {/* Checkbox visual */}
            <div className={cn(
                'h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                selected ? 'bg-primary border-primary' : 'border-border',
            )}>
                {selected && <span className="text-black text-[10px] font-bold leading-none">✓</span>}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">
                        {automation.name}
                    </span>
                    <Badge variant={automation.enabled ? 'success' : 'neutral'} className="text-[10px] shrink-0">
                        {automation.enabled ? 'Ativa' : 'Inativa'}
                    </Badge>
                </div>
                <DestinationBadge automation={automation} />
            </div>

            {/* Send result indicator */}
            {result && (
                result.success
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : <XCircle     className="h-4 w-4 text-red-400 shrink-0"     title={result.error} />
            )}
        </button>
    );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function CustomBroadcastPanel() {
    const [automations, setAutomations] = useState<AutomationRecord[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [selected,    setSelected]    = useState<Set<string>>(new Set());
    const [message,     setMessage]     = useState('');
    const [sending,     setSending]     = useState(false);
    const [results,     setResults]     = useState<Record<string, { success: boolean; error?: string }>>({});

    const load = useCallback(async () => {
        setLoading(true);
        const data = await listAutomationsAction();
        // Only show automations that have a real destination configured
        setAutomations(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === automations.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(automations.map(a => a.id)));
        }
    };

    const handleSend = async () => {
        if (!message.trim() || selected.size === 0) return;
        setSending(true);
        setResults({});

        const { results: res } = await sendCustomBroadcastAction([...selected], message.trim());

        const map: Record<string, { success: boolean; error?: string }> = {};
        for (const r of res) map[r.id] = { success: r.success, error: r.error };
        setResults(map);
        setSending(false);
    };

    const sentCount   = Object.values(results).filter(r => r.success).length;
    const failedCount = Object.values(results).filter(r => !r.success).length;

    if (loading) {
        return (
            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-bold">Disparar Mensagem</h3>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Disparar Mensagem</h3>
                </div>
                {selected.size > 0 && (
                    <Badge variant="info" className="text-[11px]">
                        {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
                    </Badge>
                )}
            </div>

            {/* Send result summary */}
            {Object.keys(results).length > 0 && (
                <div className={cn(
                    'flex items-center gap-2 text-sm p-3 rounded-lg',
                    failedCount === 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                )}>
                    {failedCount === 0
                        ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Enviado para {sentCount} destino{sentCount !== 1 ? 's' : ''} com sucesso.</>
                        : <><AlertCircle  className="h-4 w-4 shrink-0" /> {sentCount} enviado{sentCount !== 1 ? 's' : ''}, {failedCount} falhou{failedCount !== 1 ? 'ram' : ''}. Veja os ícones abaixo.</>}
                </div>
            )}

            {/* Automations list */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Destinos (configurados em Automações)
                    </p>
                    {automations.length > 1 && (
                        <button
                            onClick={toggleAll}
                            className="text-[11px] text-primary hover:underline"
                        >
                            {selected.size === automations.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                    )}
                </div>

                {automations.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                            Nenhuma automação configurada. Crie uma na aba <strong>Automações</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {automations.map(a => (
                            <AutomationRow
                                key={a.id}
                                automation={a}
                                selected={selected.has(a.id)}
                                onToggle={() => toggle(a.id)}
                                result={results[a.id]}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Message composer */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Mensagem
                </label>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Digite a mensagem a ser enviada…&#10;&#10;Use *negrito* para formatar."
                    rows={5}
                    className={cn(
                        'w-full rounded-xl border border-border bg-background/50 px-3 py-2.5',
                        'text-sm text-foreground placeholder:text-muted-foreground',
                        'resize-none focus:outline-none focus:ring-1 focus:ring-primary/50',
                    )}
                />
                <p className="text-[11px] text-muted-foreground">
                    Suporta formatação WhatsApp: <code className="font-mono">*negrito*</code>, <code className="font-mono">_itálico_</code>, <code className="font-mono">~tachado~</code>
                </p>
            </div>

            {/* Send button */}
            <Button
                variant="primary"
                onClick={handleSend}
                disabled={sending || selected.size === 0 || !message.trim()}
                className="w-full"
            >
                {sending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando para {selected.size} destino{selected.size !== 1 ? 's' : ''}…</>
                    : <><Send className="h-4 w-4 mr-2" />Enviar para {selected.size} destino{selected.size !== 1 ? 's' : ''}</>}
            </Button>
        </GlassCard>
    );
}
