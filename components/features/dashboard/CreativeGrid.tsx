"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { fetchTopCreativesAction } from "@/actions/meta-actions";
import { MetaCreative } from "@/lib/balance-utils";
import { CreativeCard } from "./CreativeCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkles, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

export function CreativeGrid({ metricFilter = 'all' }: { metricFilter?: 'all' | 'sales' | 'leads_form' | 'leads_gtm' }) {
    const { selectedAccount } = useAccount();
    const { preset } = useDate();
    const [creatives, setCreatives] = useState<MetaCreative[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 4;

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            setCurrentPage(0); // Reset page on account/date change
            fetchTopCreativesAction(selectedAccount.id, preset)
                .then(setCreatives)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [selectedAccount, preset]);

    if (!selectedAccount) return null;

    const totalPages = Math.ceil(creatives.length / ITEMS_PER_PAGE);
    const paginatedCreatives = creatives.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Melhores Criativos</h2>
                        <p className="text-sm text-muted-foreground">Os anúncios com melhor performance no período selecionado.</p>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors border border-white/5"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-medium text-muted-foreground min-w-12 text-center">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors border border-white/5"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <GlassCard key={i} className="aspect-4/5 animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : creatives.length === 0 ? (
                <GlassCard className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Sparkles className="h-8 w-8 opacity-20" />
                        <p>Nenhum criativo encontrado nesta conta.</p>
                    </div>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {paginatedCreatives.map((creative) => (
                        <CreativeCard key={creative.id} creative={creative} metricFilter={metricFilter} />
                    ))}
                </div>
            )}
        </div>
    );
}
