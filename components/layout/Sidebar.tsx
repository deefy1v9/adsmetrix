"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Wallet,
    Users,
    BarChart3,
    Bell,
    Settings,
    LogOut,
    MessageSquare,
    Zap,
    Target,
    ScrollText,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth-actions";
import Image from "next/image";
import { useEffect } from "react";
import { useSidebar } from "@/components/providers/SidebarContext";

type MenuItem =
    | { name: string; href: string; icon: React.ElementType; imgSrc?: never }
    | { name: string; href: string; imgSrc: string; icon?: never };

const menuItems: MenuItem[] = [
    { name: "Visão Geral", icon: LayoutDashboard, href: "/overview" },
    { name: "Gestor de Tráfego", icon: Target, href: "/gestor-trafego" },
    { name: "Dashboard", icon: BarChart3, href: "/" },
    { name: "Leads", icon: Users, href: "/leads" },
    { name: "Performance", icon: TrendingUp, href: "/performance" },
    { name: "Automações", icon: Zap, href: "/automations" },
    { name: "WhatsApp", icon: MessageSquare, href: "/whatsapp-reports" },
    { name: "Logs", icon: ScrollText, href: "/logs" },
    { name: "Notificações", icon: Bell, href: "/notifications" },
    { name: "Configurações", icon: Settings, href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, mobileOpen, closeMobile } = useSidebar();

    // Close mobile sidebar on route change
    useEffect(() => {
        closeMobile();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={closeMobile}
                />
            )}

            <aside
                data-open={mobileOpen}
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 ease-in-out overflow-hidden",
                    // Base: always hidden on mobile, revealed via data-open
                    "-translate-x-full data-[open=true]:translate-x-0",
                    // Desktop: always visible
                    "md:translate-x-0",
                    // Width
                    "w-56",
                    isCollapsed ? "md:w-20" : "md:w-56",
                )}
            >
                <div className="flex h-full flex-col px-3 py-8">
                    {/* Brand */}
                    <div className={cn("flex items-center mb-10 transition-all", isCollapsed ? "md:justify-center px-2" : "px-4")}>
                        {isCollapsed ? (
                            <LayoutDashboard className="w-5 h-5 text-primary" />
                        ) : (
                            <span className="text-lg font-black text-foreground tracking-tight">
                                Ads<span className="text-primary">.</span>
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={isCollapsed ? item.name : ""}
                                    className={cn(
                                        "flex items-center rounded-full transition-all duration-200",
                                        isCollapsed ? "md:justify-center md:p-2.5 md:mx-auto md:w-12 md:h-12 gap-3 px-4 py-2.5" : "gap-3 px-4 py-2.5",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    {item.imgSrc ? (
                                        <Image
                                            src={item.imgSrc}
                                            alt={item.name}
                                            width={20}
                                            height={20}
                                            className="h-5 w-5 shrink-0 rounded-md"
                                        />
                                    ) : item.icon ? (
                                        (() => { const Icon = item.icon; return <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />; })()
                                    ) : null}
                                    <span className={cn("text-sm font-bold truncate", isCollapsed ? "md:hidden" : "")}>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="border-t border-border pt-6">
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                className={cn(
                                    "flex items-center rounded-full text-sm font-bold text-red-500 transition-colors hover:bg-red-500/5",
                                    isCollapsed ? "md:justify-center md:p-2.5 md:mx-auto md:w-12 md:h-12 w-full gap-3 px-4 py-2.5" : "w-full gap-3 px-4 py-2.5"
                                )}
                                title={isCollapsed ? "Sair" : ""}
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                                <span className={cn(isCollapsed ? "md:hidden" : "")}>Sair</span>
                            </button>
                        </form>
                    </div>
                </div>
            </aside>
        </>
    );
}
