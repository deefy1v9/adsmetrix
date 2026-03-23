"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    toggleSidebar: () => void;
    mobileOpen: boolean;
    toggleMobile: () => void;
    closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved !== null) {
            setIsCollapsed(saved === "true");
        }
    }, []);

    const handleSetCollapsed = (value: boolean) => {
        setIsCollapsed(value);
        localStorage.setItem("sidebar-collapsed", String(value));
    };

    const toggleSidebar = () => {
        handleSetCollapsed(!isCollapsed);
    };

    const toggleMobile = () => {
        setMobileOpen(prev => !prev);
    };

    const closeMobile = () => {
        setMobileOpen(false);
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed: handleSetCollapsed, toggleSidebar, mobileOpen, toggleMobile, closeMobile }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}
