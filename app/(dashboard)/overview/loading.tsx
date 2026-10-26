import { SkeletonKPICard, Skeleton } from "@/components/ui/Skeleton";
import { GlassCard } from "@/components/ui/GlassCard";

export default function OverviewLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <Skeleton className="hidden sm:block h-11 w-11 shrink-0 rounded-xl" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonKPICard key={i} />)}
            </div>

            <GlassCard>
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-56 w-full rounded-lg" />
            </GlassCard>

            <GlassCard>
                <Skeleton className="h-5 w-64 mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}
