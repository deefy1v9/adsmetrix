"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface WebhookLog {
    id: string;
    payload: any;
    receivedAt: string | Date;
}

export function WebhookMonitor() {
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/debug/webhooks");
            const data = await res.json();
            setLogs(data.logs?.slice(0, 5) || []);
        } catch (error) {
            console.error("Failed to fetch webhook logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Pool every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <GlassCard className="col-span-1 lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-neon" />
                    <h3 className="text-lg font-semibold text-foreground">Monitor de Webhooks (Meta)</h3>
                </div>
                <Badge variant="neutral" className="text-[10px] uppercase tracking-wider">
                    Tempo Real
                </Badge>
            </div>

            <div className="space-y-4">
                {loading && <div className="text-sm text-muted-foreground animate-pulse">Carregando logs...</div>}

                {!loading && logs.length === 0 && (
                    <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                        Nenhum evento recebido recentemente.
                    </div>
                )}

                {logs.map((log) => {
                    const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
                    const isVerification = payload?.type === "verification";
                    const isLead = payload?.entry?.[0]?.changes?.[0]?.field === "leadgen";

                    return (
                        <div key={log.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-3">
                                {isVerification ? (
                                    <CheckCircle2 className="h-4 w-4 text-foreground/60 mt-0.5" />
                                ) : isLead ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
                                ) : (
                                    <Clock className="h-4 w-4 text-yellow-400 mt-0.5" />
                                )}
                                <div>
                                    <div className="text-xs font-medium text-foreground">
                                        {isVerification ? "Verificação de Token Meta" : isLead ? "Novo Lead Recebido" : "Evento Desconhecido"}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate max-w-[200px] lg:max-w-md">
                                        ID: {log.id}
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(log.receivedAt).toLocaleTimeString("pt-BR")}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                    Garante que a integração com o Facebook via Docker Swarm está saudável.
                </p>
            </div>
        </GlassCard>
    );
}
