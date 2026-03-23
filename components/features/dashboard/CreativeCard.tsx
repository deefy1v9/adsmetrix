"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { MetaCreative } from "@/lib/balance-utils";
import { Eye, MessageSquare, ExternalLink, TrendingUp, Play } from "lucide-react";

interface CreativeCardProps {
    creative: MetaCreative;
    metricFilter?: 'all' | 'sales' | 'leads_form' | 'leads_gtm';
}

export function CreativeCard({ creative, metricFilter = 'all' }: CreativeCardProps) {
    const leads = parseInt(creative.insights?.leads || "0");
    const sales = parseInt(creative.insights?.sales || "0");
    const leadsForm = parseInt(creative.insights?.leads_form || "0");
    const leadsGTM = parseInt(creative.insights?.leads_gtm || "0");

    const spend = parseFloat(creative.insights?.spend || "0");
    const impressions = parseInt(creative.insights?.impressions || "0");
    const ctr = parseFloat(creative.insights?.ctr || "0");

    const activeMetricValue =
        metricFilter === 'sales' ? sales :
            metricFilter === 'leads_form' ? leadsForm :
                metricFilter === 'leads_gtm' ? leadsGTM : leads;

    const metricNames: Record<string, string> = {
        'all': 'Leads',
        'sales': 'Vendas',
        'leads_form': 'Leads Form',
        'leads_gtm': 'Leads GTM'
    };

    const isVideo = !!creative.video_id;
    const imgSrc = creative.thumbnail_url
        ? `/api/img-proxy?url=${encodeURIComponent(creative.thumbnail_url)}`
        : null;

    return (
        <GlassCard className="overflow-hidden flex flex-col h-full group">
            {/* Ad Preview / Thumbnail */}
            <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={creative.name}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <TrendingUp className="h-12 w-12 opacity-20" />
                    </div>
                )}

                {/* Video play indicator */}
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                            <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                    </div>
                )}

                <div className="absolute top-2 right-2 flex gap-2">
                    {isVideo && (
                        <Badge variant="default" className="shadow-lg backdrop-blur-md bg-black/60 text-white text-[10px]">
                            VIDEO
                        </Badge>
                    )}
                    <Badge variant={(creative.effective_status ?? creative.status) === 'ACTIVE' ? 'success' : 'default'} className="shadow-lg backdrop-blur-md">
                        {creative.effective_status ?? creative.status}
                    </Badge>
                </div>

                {creative.preview_url && (
                    <a
                        href={creative.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-white font-medium"
                    >
                        {isVideo ? 'Ver Vídeo' : 'Ver Anúncio'} <ExternalLink className="h-4 w-4" />
                    </a>
                )}
            </div>

            {/* Info and Metrics */}
            <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight h-10" title={creative.name}>
                        {creative.name}
                    </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            <Eye className="h-3 w-3" /> Impressões
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            {impressions.toLocaleString('pt-BR')}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            <TrendingUp className="h-3 w-3" /> CTR
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            {ctr.toFixed(2)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            <MessageSquare className="h-3 w-3 text-emerald-400" /> {metricNames[metricFilter]}
                        </div>
                        <div className="text-sm font-bold text-emerald-400">
                            {activeMetricValue}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Gasto
                        </div>
                        <div className="text-sm font-bold text-foreground">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(spend)}
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
