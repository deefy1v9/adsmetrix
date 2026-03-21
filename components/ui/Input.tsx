import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: typeof Search;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon: Icon, ...props }, ref) => {
        return (
            <div className="relative">
                {Icon && (
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                        Icon && "pl-10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
