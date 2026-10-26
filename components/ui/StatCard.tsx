import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ElementType;
    /** Secondary line under the value */
    hint?: React.ReactNode;
    /** Highlights the card with the brand accent (use for the one metric that matters most) */
    highlight?: boolean;
    loading?: boolean;
    className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, highlight, loading, className }: StatCardProps) {
    return (
        <div className={cn(
            "glass-card relative overflow-hidden rounded-xl p-4 sm:p-5",
            highlight && "border-brand/40",
            className
        )}>
            {highlight && <div className="absolute inset-x-0 top-0 h-0.5 bg-brand" />}
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
                {Icon && (
                    <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        highlight ? "bg-brand/15 text-brand-ink" : "bg-muted text-muted-foreground"
                    )}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                )}
            </div>
            {loading ? (
                <Skeleton className="mt-3 h-7 w-24" />
            ) : (
                <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular truncate">{value}</div>
            )}
            {hint && !loading && <div className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</div>}
        </div>
    );
}
