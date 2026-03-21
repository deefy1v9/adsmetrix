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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/actions/auth-actions";
import Image from "next/image";

type MenuItem =
    | { name: string; href: string; icon: React.ElementType; imgSrc?: never }
    | { name: string; href: string; imgSrc: string; icon?: never };

const menuItems: MenuItem[] = [
    { name: "Visão Geral", icon: LayoutDashboard, href: "/overview" },
    { name: "Gestor de Tráfego", icon: Target, href: "/gestor-trafego" },
    { name: "Criativo.Art", imgSrc: "/criativo-art-logo.svg", href: "/criativo-art" },
    { name: "Dashboard", icon: BarChart3, href: "/" },
    { name: "Contas", icon: Wallet, href: "/accounts" },
    { name: "Leads", icon: Users, href: "/leads" },
    { name: "Relatórios WhatsApp", icon: MessageSquare, href: "/whatsapp-reports" },
    { name: "Automações", icon: Zap, href: "/automations" },
    { name: "Logs", icon: ScrollText, href: "/logs" },
    { name: "Notificações", icon: Bell, href: "/notifications" },
    { name: "Configurações", icon: Settings, href: "/settings" },
];

import { useSidebar } from "@/components/providers/SidebarContext";

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed } = useSidebar();

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 ease-in-out md:translate-x-0 overflow-hidden",
                isCollapsed ? "w-20" : "w-56",
                "-translate-x-full"
            )}
        >
            <div className="flex h-full flex-col px-3 py-8">
                {/* Logo */}
                <div className={cn("flex items-center justify-center mb-10 transition-all", isCollapsed ? "px-0" : "px-4")}>
                    <Logo className={cn("transition-all", isCollapsed ? "scale-75" : "scale-100")} />
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
                                    isCollapsed ? "justify-center p-2.5 mx-auto w-12 h-12" : "gap-3 px-4 py-2.5",
                                    isActive
                                        ? "bg-primary text-black shadow-sm"
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
                                    (() => { const Icon = item.icon; return <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-black" : "text-muted-foreground")} />; })()
                                ) : null}
                                {!isCollapsed && <span className="text-sm font-bold truncate">{item.name}</span>}
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
                                isCollapsed ? "justify-center p-2.5 mx-auto w-12 h-12" : "w-full gap-3 px-4 py-2.5"
                            )}
                            title={isCollapsed ? "Sair" : ""}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span>Sair</span>}
                        </button>
                    </form>
                </div>
            </div>
        </aside>
    );
}
