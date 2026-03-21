import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, hoverEffect = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "glass-card rounded-xl p-6 transition-all duration-300",
                    hoverEffect && "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
