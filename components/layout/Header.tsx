"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { DateSelector } from "./DateSelector";
import { CommandPalette } from "./CommandPalette";
import { useSidebar } from "@/components/providers/SidebarContext";
import { AccountSelector } from "@/components/features/accounts/AccountSelector";
import { findNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Header() {
    const { toggleMobile } = useSidebar();
    const pathname = usePathname();
    const [paletteOpen, setPaletteOpen] = useState(false);

    const current = findNavItem(pathname);
    const showAccount = !!current?.usesMetaAccount;
    const showDate = !!current?.usesDateRange;
    const hasFilters = showAccount || showDate;

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={toggleMobile}
                    className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                    aria-label="Abrir menu"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Breadcrumb */}
                <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-sm">
                    {current && (
                        <>
                            <span className="hidden lg:inline text-muted-foreground">{current.group}</span>
                            <ChevronRight className="hidden lg:inline h-3.5 w-3.5 text-muted-foreground/60" />
                        </>
                    )}
                    <span className="truncate font-semibold text-foreground">{current?.name ?? "Painel"}</span>
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    {/* Page context filters (desktop) */}
                    {hasFilters && (
                        <div className="hidden sm:flex items-center gap-2">
                            {showAccount && <AccountSelector />}
                            {showDate && <DateSelector />}
                        </div>
                    )}

                    {hasFilters && <div className="hidden sm:block h-6 w-px bg-border mx-1" />}

                    <button
                        onClick={() => setPaletteOpen(true)}
                        className={cn(
                            "flex h-9 items-center gap-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                            "w-9 justify-center xl:w-56 xl:justify-start xl:border xl:border-input xl:bg-card xl:px-3 xl:shadow-xs"
                        )}
                        aria-label="Buscar (Ctrl+K)"
                        title="Buscar (Ctrl+K)"
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <span className="hidden xl:inline text-sm">Buscar...</span>
                        <kbd className="ml-auto hidden xl:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium">Ctrl K</kbd>
                    </button>

                    <ThemeToggle />

                    <Link
                        href="/notifications"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Notificações"
                        title="Notificações"
                    >
                        <Bell className="h-[18px] w-[18px]" />
                    </Link>
                </div>
            </div>

            {/* Page context filters (mobile) */}
            {hasFilters && (
                <div className="flex sm:hidden items-center gap-2 px-4 pb-3">
                    {showAccount && <div className="min-w-0 flex-1"><AccountSelector className="w-full" /></div>}
                    {showDate && <div className={cn(showAccount ? "shrink-0" : "flex-1")}><DateSelector className={showAccount ? undefined : "w-full"} /></div>}
                </div>
            )}

            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </header>
    );
}
