import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: React.ElementType;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

/** Friendly placeholder for "nothing here yet" and "not configured" states. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn(
            "relative overflow-hidden flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14",
            className
        )}>
            <div className="absolute inset-0 bg-dots opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="relative flex flex-col items-center">
                {Icon && (
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                )}
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                {description && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}
                {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
            </div>
        </div>
    );
}
