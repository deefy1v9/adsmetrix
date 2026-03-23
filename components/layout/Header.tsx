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
        <header className="sticky top-0 z-30 mb-8 flex items-center justify-between border-b border-border bg-background/95 px-4 sm:px-8 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={handleToggle}
                        className="p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>
                </div>

                {/* Account Selector */}
                <AccountSelector />

                {/* Date Picker */}
                <div className="hidden sm:block">
                    <DateSelector />
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-5">
                {/* Search */}
                <div className="relative hidden w-64 md:block">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar campanha..."
                        className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm font-medium text-foreground focus:border-primary/50 focus:outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <button className="relative rounded-full border border-border bg-card p-2.5 text-foreground transition-all hover:border-primary/50 shadow-sm">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-sm" />
                </button>

                <div className="flex items-center gap-4 border-l border-border pl-3 sm:pl-6 ml-1 sm:ml-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black font-black text-sm shadow-sm ring-2 ring-primary/20">
                        {user?.name
                            ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                            : user?.email?.substring(0, 2).toUpperCase() || "?"}
                    </div>
                </div>
            </div>
        </header>
    );
}
