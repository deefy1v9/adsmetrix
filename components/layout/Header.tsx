"use client";

import { Bell, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useSidebar } from "@/components/providers/SidebarContext";
import { useUser } from "@/components/providers/UserContext";
import { AccountSelector } from "@/components/features/accounts/AccountSelector";

import { DateSelector } from "./DateSelector";

export function Header() {
    const { isCollapsed, toggleSidebar, toggleMobile } = useSidebar();
    const user = useUser();

    const handleToggle = () => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            toggleMobile();
        } else {
            toggleSidebar();
        }
    };

    return (
        <header className="sticky top-0 z-30 mb-6 border-b border-border bg-card/95 px-4 sm:px-8 pt-3 pb-3 backdrop-blur-md shadow-sm shadow-black/[0.04]">
            {/* Main row */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <button
                        onClick={handleToggle}
                        className="p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
                        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>

                    {/* Account Selector */}
                    <AccountSelector />

                    {/* Date Picker — hidden on mobile, shown in second row below */}
                    <div className="hidden sm:block">
                        <DateSelector />
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {/* Search — desktop only */}
                    <div className="relative hidden w-56 lg:block">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar campanha..."
                            className="w-full rounded-full border border-border bg-card py-2 pl-11 pr-4 text-sm font-medium text-foreground focus:border-primary/50 focus:outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications */}
                    <button className="relative rounded-full border border-border bg-card p-2 sm:p-2.5 text-foreground transition-all hover:border-primary/50 shadow-sm">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-sm" />
                    </button>

                    <div className="flex items-center gap-3 border-l border-border pl-2 sm:pl-4">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-xs sm:text-sm shadow-sm ring-2 ring-primary/20">
                            {user?.name
                                ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                                : user?.email?.substring(0, 2).toUpperCase() || "?"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile DateSelector row */}
            <div className="flex sm:hidden mt-2.5 w-full">
                <DateSelector className="w-full" />
            </div>
        </header>
    );
}
