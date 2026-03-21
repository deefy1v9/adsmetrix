import { Skeleton } from "@/components/ui/Skeleton";
import { GlassCard } from "@/components/ui/GlassCard";

export default function AccountsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-52" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-9 w-28 rounded-md" />
            </div>

            <GlassCard>
                <div className="space-y-3 p-2">
                    <div className="flex gap-4 px-4 py-2">
                        {["Conta", "Moeda", "Saldo", "Total Gasto", "Status", "Ações"].map((h) => (
                            <Skeleton key={h} className="h-4 flex-1" />
                        ))}
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-border/30">
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-24 rounded-md" />
                                <Skeleton className="h-8 w-24 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}
