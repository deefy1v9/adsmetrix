"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/providers/AccountContext";
import { useDate } from "@/components/providers/DateContext";
import { fetchTopCreativesAction } from "@/actions/meta-actions";
import { MetaCreative } from "@/lib/balance-utils";
import { CreativeCard } from "./CreativeCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/PageHeader";
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
        <div className="space-y-4">
            <SectionTitle
                title={
                    <span className="inline-flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-warning" />
                        Melhores criativos
                    </span>
                }
                description="Os anúncios com melhor performance no período selecionado."
                actions={totalPages > 1 && (
                    <>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            aria-label="Página anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground min-w-12 text-center tabular">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            aria-label="Próxima página"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            />

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="aspect-4/5 rounded-xl" />
                    ))}
                </div>
            ) : creatives.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    title="Nenhum criativo encontrado"
                    description="Esta conta não tem anúncios com entrega no período selecionado."
                    className="py-10"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {paginatedCreatives.map((creative) => (
                        <CreativeCard key={creative.id} creative={creative} />
                    ))}
                </div>
            )}
        </div>
    );
}
