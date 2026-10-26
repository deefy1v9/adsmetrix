import { cn } from "@/lib/utils";

export type IntegrationStatus = "connected" | "attention" | "disconnected" | "loading";

const STATUS: Record<IntegrationStatus, { label: string; dot: string; text: string }> = {
    connected: { label: "Conectado", dot: "bg-success", text: "text-success" },
    attention: { label: "Requer atenção", dot: "bg-warning", text: "text-warning" },
    disconnected: { label: "Não conectado", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
    loading: { label: "Verificando…", dot: "bg-muted-foreground/30 animate-pulse", text: "text-muted-foreground" },
};

/** Card shell shared by every integration on the Integrations page. */
export function IntegrationCard({ id, icon: Icon, title, description, status, statusLabel, actions, children, className }: {
    id?: string;
    icon: React.ElementType;
    title: string;
    description: React.ReactNode;
    status?: IntegrationStatus;
    statusLabel?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}) {
    const s = status ? STATUS[status] : null;
    return (
        <section id={id} className={cn("glass-card scroll-mt-24 rounded-xl", className)}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="text-base font-semibold text-foreground">{title}</h2>
                            {s && (
                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", s.text)}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                                    {statusLabel ?? s.label}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children && <div className="border-t border-border p-5 sm:p-6">{children}</div>}
        </section>
    );
}
