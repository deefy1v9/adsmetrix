import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "card" | "circle";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse bg-muted/60 rounded-md",
                variant === "circle" && "rounded-full",
                variant === "card" && "rounded-xl",
                className
            )}
            {...props}
        />
    );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
    return (
        <tr className="border-b border-border/40">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" style={{ width: `${60 + Math.random() * 30}%` }} />
                </td>
            ))}
        </tr>
    );
}

export function SkeletonKPICard() {
    return (
        <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton variant="circle" className="h-8 w-8" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}
