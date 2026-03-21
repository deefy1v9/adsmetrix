import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "neon";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "bg-primary text-primary-foreground border-transparent",
        success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        danger: "bg-red-500/10 text-red-600 border-red-500/20",
        info: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
        neutral: "bg-muted text-muted-foreground border-border",
        neon: "bg-[#1C1C1C] text-[#bdf03b] border-transparent font-bold",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-medium transition-colors uppercase tracking-wider",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
