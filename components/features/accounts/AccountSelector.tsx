"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/providers/AccountContext";
import { MetaIcon } from "@/components/ui/PlatformIcons";

export function AccountSelector({ className }: { className?: string }) {
    const { accounts, selectedAccount, setSelectedAccount, isLoading } = useAccount();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredAccounts = accounts.filter(account =>
        account.name.toLowerCase().includes(search.toLowerCase()) || account.id.includes(search)
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div className={cn("relative min-w-0", className)} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-left shadow-xs transition-colors hover:bg-accent disabled:opacity-60",
                    isOpen && "border-ring ring-2 ring-ring/20"
                )}
            >
                <MetaIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:max-w-[200px]">
                    {isLoading ? "Carregando contas..." : selectedAccount?.name || (accounts.length === 0 ? "Nenhuma conta" : "Selecionar conta")}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 z-50 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 origin-top-left">
                    <div className="relative mb-1.5">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar conta por nome ou ID..."
                            className="w-full rounded-lg border-none bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/25"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[360px] overflow-y-auto no-scrollbar" role="listbox">
                        {filteredAccounts.length > 0 ? (
                            <div className="grid gap-0.5">
                                {filteredAccounts.map((account) => {
                                    const isSelected = selectedAccount?.id === account.id;
                                    return (
                                        <button
                                            key={account.id}
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => {
                                                setSelectedAccount(account);
                                                setIsOpen(false);
                                                setSearch("");
                                            }}
                                            className={cn(
                                                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                                                isSelected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                            )}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium">{account.name}</span>
                                                <span className="block truncate text-[11px] text-muted-foreground">{account.id}</span>
                                            </span>
                                            {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-ink" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {accounts.length === 0 ? "Nenhuma conta Meta conectada" : "Nenhuma conta encontrada"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
