'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { listActiveCampaignsWithEndDateAction, type CampaignWithEndDate } from '@/actions/campaign-end-actions';
import { cn } from '@/lib/utils';

function formatBRT(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day:    '2-digit',
        month:  '2-digit',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    });
}

function daysUntil(iso: string): number {
    const target = new Date(iso);
    const targetBRT = new Date(target.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const nowBRT    = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    targetBRT.setHours(0, 0, 0, 0);
    nowBRT.setHours(0, 0, 0, 0);
    return Math.round((targetBRT.getTime() - nowBRT.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
    if (days < 0) return 'text-zinc-500';
    if (days === 0) return 'text-red-400';
    if (days === 1) return 'text-amber-400';
    if (days <= 3) return 'text-yellow-400';
    return 'text-emerald-400';
}

function urgencyLabel(days: number): string {
    if (days < 0) return 'Encerrada';
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `Em ${days} dias`;
}

export function CampaignEndDatesPanel() {
    const [campaigns, setCampaigns] = useState<CampaignWithEndDate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        const res = await listActiveCampaignsWithEndDateAction();
        if (res.success) {
            setCampaigns(res.campaigns);
        } else {
            setError(res.error || 'Erro ao carregar campanhas');
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    return (
        <GlassCard className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-bold">Campanhas Ativas com Data de Término</h3>
                    {!loading && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {campaigns.length}
                        </span>
                    )}
                </div>
                <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
                    {loading
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…</>
                        : <><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</>}
                </Button>
            </div>

            {error && (
                <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    {error}
                </div>
            )}

            {!loading && !error && campaigns.length === 0 && (
                <div className="text-sm p-4 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center">
                    Nenhuma campanha ativa com data de término configurada.
                </div>
            )}

            {!loading && campaigns.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((c) => {
                        const days = daysUntil(c.stopTime);
                        return (
                            <div
                                key={`${c.accountId}-${c.campaignId}`}
                                className="p-4 rounded-xl bg-white/5 border border-border hover:border-amber-500/40 transition-colors space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-sm leading-tight line-clamp-2">{c.campaignName}</h4>
                                    <span className={cn('shrink-0 text-xs font-bold px-2 py-1 rounded-md bg-white/5 border border-border', urgencyColor(days))}>
                                        {urgencyLabel(days)}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">Conta de Anúncio</span>
                                    <div className="text-foreground/90 font-medium truncate">{c.accountName}</div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                                    <CalendarClock className="h-3 w-3" />
                                    <span>{formatBRT(c.stopTime)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </GlassCard>
    );
}
