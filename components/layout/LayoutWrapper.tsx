"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useSidebar } from "@/components/providers/SidebarContext";
import { useUser } from "@/components/providers/UserContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { isPathAllowed, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const user = useUser();
    const pathname = usePathname();

    // allowed_tabs used to only hide sidebar links; typing the URL still opened the page
    const allowed = isPathAllowed(pathname, user?.allowed_tabs);
    const firstAllowed = NAV_ITEMS.find(i => !user?.allowed_tabs || user.allowed_tabs.includes(i.href));

    return (
        <div className="flex min-h-dvh">
            <Sidebar />
            <div
                className={cn(
                    "flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-in-out",
                    isCollapsed ? "md:pl-[72px]" : "md:pl-[248px]"
                )}
            >
                <Header />
                <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {allowed ? children : (
                        <EmptyState
                            icon={Lock}
                            title="Você não tem acesso a esta página"
                            description="O administrador do workspace limitou as abas disponíveis para o seu usuário."
                            action={firstAllowed && (
                                <Link href={firstAllowed.href}>
                                    <Button variant="outline">Ir para {firstAllowed.name}</Button>
                                </Link>
                            )}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
