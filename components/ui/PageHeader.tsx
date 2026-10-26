import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Small label above the title, e.g. the platform ("Meta Ads") */
    eyebrow?: React.ReactNode;
    icon?: React.ElementType;
    /** Buttons/filters rendered on the right (stacked under the title on mobile) */
    actions?: React.ReactNode;
    className?: string;
}

/** Consistent title block for every dashboard page. */
export function PageHeader({ title, description, eyebrow, icon: Icon, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
            <div className="flex items-start gap-3 min-w-0">
                {Icon && (
                    <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                        <Icon className="h-5 w-5 text-foreground" />
                    </div>
                )}
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
                    )}
                    <h1 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
                    {description && (
                        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
        </div>
    );
}

/** Section title used inside a page (smaller than PageHeader). */
export function SectionTitle({ title, description, actions, className }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
