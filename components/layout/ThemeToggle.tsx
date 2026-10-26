"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/hooks/use-is-client";

export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();
    // resolvedTheme is unknown during SSR — render the dark-theme icon until hydrated
    const isClient = useIsClient();
    const isDark = isClient ? resolvedTheme === "dark" : true;

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                className
            )}
            aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
            title={isDark ? "Tema claro" : "Tema escuro"}
        >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
    );
}
