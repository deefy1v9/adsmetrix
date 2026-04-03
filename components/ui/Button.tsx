import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent font-bold rounded-full shadow-sm shadow-primary/10",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border rounded-full",
            outline: "bg-transparent border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-full",
            ghost: "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-accent rounded-full",
            destructive: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 rounded-full",
            glass: "bg-card border-border text-foreground hover:bg-accent rounded-full shadow-sm",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 text-sm",
            lg: "h-12 px-6 text-base",
            icon: "h-10 w-10 p-0 flex items-center justify-center",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-95",
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
