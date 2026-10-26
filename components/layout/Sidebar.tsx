"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth-actions";
import { useEffect } from "react";
import { useSidebar } from "@/components/providers/SidebarContext";
import { useUser } from "@/components/providers/UserContext";
import { BrandMark } from "@/components/ui/Logo";
import {
    APP_NAME, NAV_GROUPS, NAV_ITEMS, ADMIN_NAV_ITEM, ADMIN_EMAIL, isNavItemActive, type NavItem,
} from "@/lib/navigation";

export function userInitials(name: string | null | undefined, email: string | null | undefined): string {
    if (name?.trim()) return name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase();
    return email?.substring(0, 2).toUpperCase() || "?";
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            title={collapsed ? item.name : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
                "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                collapsed && "md:justify-center md:px-0",
                active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
        >
            {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />}
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            <span className={cn("truncate", collapsed && "md:hidden")}>{item.name}</span>
            {item.badge && (
                <span className={cn(
                    "ml-auto rounded-full bg-brand/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-brand-ink",
                    collapsed && "md:hidden"
                )}>
                    {item.badge}
                </span>
            )}
        </Link>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar, mobileOpen, closeMobile } = useSidebar();
    const user = useUser();

    const isAdmin = user?.email === ADMIN_EMAIL;

    // Filter tabs: if allowed_tabs is set, only show permitted hrefs
    const visibleItems = NAV_ITEMS.filter(item =>
        !user?.allowed_tabs || user.allowed_tabs.includes(item.href)
    );

    // Close mobile sidebar on route change
    useEffect(() => {
        closeMobile();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden animate-in fade-in duration-150"
                    onClick={closeMobile}
                />
            )}

            <aside
                data-open={mobileOpen}
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-border bg-sidebar transition-[width,transform] duration-300 ease-in-out",
                    // Mobile: off-canvas drawer revealed via data-open
                    "w-[264px] -translate-x-full data-[open=true]:translate-x-0 data-[open=true]:shadow-2xl",
                    // Desktop: always visible
                    "md:translate-x-0 md:shadow-none",
                    isCollapsed ? "md:w-[72px]" : "md:w-[248px]",
                )}
            >
                {/* Brand */}
                <div className={cn("flex h-16 shrink-0 items-center gap-2.5 px-4", isCollapsed && "md:justify-center md:px-0")}>
                    <Link href="/overview" className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                            <BrandMark className="h-[18px] w-[18px]" />
                        </div>
                        <div className={cn("min-w-0", isCollapsed && "md:hidden")}>
                            <p className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">{APP_NAME}</p>
                            {user?.workspace_name && (
                                <p className="truncate text-[11px] leading-tight text-muted-foreground">{user.workspace_name}</p>
                            )}
                        </div>
                    </Link>
                    <button
                        onClick={closeMobile}
                        className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                        aria-label="Fechar menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
                    {NAV_GROUPS.map(group => {
                        const items = visibleItems.filter(i => i.group === group);
                        if (group === "Sistema" && isAdmin) items.push(ADMIN_NAV_ITEM);
                        if (items.length === 0) return null;
                        return (
                            <div key={group} className="mt-4 first:mt-1">
                                <p className={cn(
                                    "mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70",
                                    isCollapsed && "md:hidden"
                                )}>
                                    {group}
                                </p>
                                {isCollapsed && <div className="mx-auto mb-2 hidden h-px w-6 bg-border md:block" />}
                                <div className="space-y-0.5">
                                    {items.map(item => (
                                        <NavLink
                                            key={item.href}
                                            item={item}
                                            active={isNavItemActive(item, pathname)}
                                            collapsed={isCollapsed}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer: collapse + user */}
                <div className="shrink-0 border-t border-border p-3 space-y-1">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "hidden md:flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                            isCollapsed && "justify-center px-0"
                        )}
                        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
                        {!isCollapsed && <span>Recolher</span>}
                    </button>

                    <div className={cn(
                        "flex items-center gap-2.5 rounded-lg p-2",
                        isCollapsed && "md:flex-col md:p-1"
                    )}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                            {userInitials(user?.name, user?.email)}
                        </div>
                        <div className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
                            <p className="truncate text-xs font-semibold text-foreground">{user?.name || "Usuário"}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                        </div>
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Sair"
                                aria-label="Sair"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>
        </>
    );
}
