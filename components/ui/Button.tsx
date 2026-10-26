import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass" | "brand";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent font-semibold shadow-sm",
            brand: "bg-brand text-brand-foreground hover:bg-brand/90 border-transparent font-semibold shadow-sm",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border",
            outline: "bg-card border-border text-foreground hover:bg-accent hover:text-accent-foreground",
            ghost: "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-accent",
            destructive: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
            glass: "bg-card border-border text-foreground hover:bg-accent shadow-sm",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs rounded-md",
            md: "h-9 px-4 text-sm rounded-lg",
            lg: "h-11 px-6 text-sm rounded-lg",
            icon: "h-9 w-9 p-0 rounded-lg flex items-center justify-center",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 border font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:translate-y-px",
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
