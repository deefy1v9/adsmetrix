import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "neon" | "brand";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "bg-primary text-primary-foreground border-transparent",
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-warning/10 text-warning border-warning/20",
        danger: "bg-destructive/10 text-destructive border-destructive/20",
        info: "bg-info/10 text-info border-info/20",
        neutral: "bg-muted text-muted-foreground border-border",
        neon: "bg-brand/15 text-brand-ink border-brand/30 font-bold",
        brand: "bg-brand text-brand-foreground border-transparent font-bold",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors uppercase tracking-wider",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
