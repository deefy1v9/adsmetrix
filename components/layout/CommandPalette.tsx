"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CornerDownLeft, Layers, LogOut, Moon, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ADMIN_NAV_ITEM, ADMIN_EMAIL } from "@/lib/navigation";
import { useAccount } from "@/components/providers/AccountContext";
import { useUser } from "@/components/providers/UserContext";
import { logoutAction } from "@/actions/auth-actions";

type Command = {
    id: string;
    label: string;
    hint?: string;
    section: "Páginas" | "Contas Meta" | "Ações";
    icon: React.ElementType;
    keywords?: string;
    run: () => void;
};

function normalize(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const router = useRouter();
    const user = useUser();
    const { accounts, setSelectedAccount } = useAccount();
    const { resolvedTheme, setTheme } = useTheme();
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Global shortcut: Ctrl/Cmd + K
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                onOpenChange(!open);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (open) { setQuery(""); setActiveIndex(0); }
    }, [open]);

    const commands = useMemo<Command[]>(() => {
        const close = () => onOpenChange(false);
        const pages = [...NAV_ITEMS, ...(user?.email === ADMIN_EMAIL ? [ADMIN_NAV_ITEM] : [])]
            .filter(i => !user?.allowed_tabs || user.allowed_tabs.includes(i.href) || i === ADMIN_NAV_ITEM)
            .map<Command>(i => ({
                id: `page:${i.href}`,
                label: i.name,
                hint: i.description,
                section: "Páginas",
                icon: i.icon,
                keywords: `${i.group} ${i.description}`,
                run: () => { close(); router.push(i.href); },
            }));

        const accountCmds = accounts.map<Command>(a => ({
            id: `acc:${a.id}`,
            label: a.name,
            hint: a.id,
            section: "Contas Meta",
            icon: Layers,
            run: () => { close(); setSelectedAccount(a); router.push("/"); },
        }));

        const actions: Command[] = [
            {
                id: "act:theme",
                label: resolvedTheme === "dark" ? "Usar tema claro" : "Usar tema escuro",
                section: "Ações",
                icon: resolvedTheme === "dark" ? Sun : Moon,
                keywords: "tema dark light modo",
                run: () => { close(); setTheme(resolvedTheme === "dark" ? "light" : "dark"); },
            },
            {
                id: "act:logout",
                label: "Sair da conta",
                section: "Ações",
                icon: LogOut,
                keywords: "logout sair",
                run: () => { close(); void logoutAction(); },
            },
        ];

        return [...pages, ...accountCmds, ...actions];
    }, [accounts, user, resolvedTheme, router, setSelectedAccount, setTheme, onOpenChange]);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) {
            // Without a query, keep the list short: every page, a handful of accounts, the actions
            let shownAccounts = 0;
            return commands.filter(c => c.section !== "Contas Meta" || shownAccounts++ < 5);
        }
        return commands.filter(c => normalize(`${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`).includes(q));
    }, [commands, query]);

    useEffect(() => { setActiveIndex(0); }, [query]);

    // Keep the highlighted row in view while navigating with the keyboard
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    if (!open) return null;

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); filtered[activeIndex]?.run(); }
        else if (e.key === "Escape") { e.preventDefault(); onOpenChange(false); }
    };

    let lastSection = "";

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-100" onClick={() => onOpenChange(false)} />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Paleta de comandos"
                className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                onKeyDown={onKeyDown}
            >
                <div className="flex items-center gap-3 border-b border-border px-4">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar páginas, contas e ações..."
                        className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        aria-label="Buscar"
                    />
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
                </div>

                <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                    {filtered.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted-foreground">Nada encontrado para “{query}”.</p>
                    )}
                    {filtered.map((c, index) => {
                        const showSection = c.section !== lastSection;
                        lastSection = c.section;
                        const Icon = c.icon;
                        const active = index === activeIndex;
                        return (
                            <div key={c.id}>
                                {showSection && (
                                    <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 first:pt-1">
                                        {c.section}
                                    </p>
                                )}
                                <button
                                    data-index={index}
                                    onMouseMove={() => setActiveIndex(index)}
                                    onClick={c.run}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                                        active ? "bg-accent text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                                        <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{c.label}</p>
                                        {c.hint && <p className="truncate text-[11px] text-muted-foreground">{c.hint}</p>}
                                    </div>
                                    {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                    <span>↑↓ navegar · Enter abrir</span>
                    <span>Ctrl K</span>
                </div>
            </div>
        </div>
    );
}
