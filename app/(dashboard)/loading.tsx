import { SkeletonKPICard, Skeleton } from "@/components/ui/Skeleton";
import { GlassCard } from "@/components/ui/GlassCard";

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-3">
                    <Skeleton className="hidden sm:block h-11 w-11 shrink-0 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-64 max-w-full" />
                    </div>
                </div>
                <Skeleton className="h-9 w-32 rounded-lg" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonKPICard key={i} />)}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                <GlassCard className="col-span-4">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </GlassCard>
                <GlassCard className="col-span-3">
                    <Skeleton className="h-5 w-40 mb-6" />
                    <div className="space-y-5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3 w-36" />
                                </div>
                                <Skeleton className="h-3.5 w-14" />
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            <GlassCard>
                <Skeleton className="h-6 w-56 mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}
