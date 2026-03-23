"use client";

import { useSidebar } from "@/components/providers/SidebarContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div
                className={cn(
                    "flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out",
                    isCollapsed ? "md:pl-20" : "md:pl-56"
                )}
            >
                <Header />
                <main className="px-4 sm:px-6 md:px-10 pb-10 animate-in fade-in duration-500">
                    {children}
                </main>
            </div>
        </div>
    );
}
