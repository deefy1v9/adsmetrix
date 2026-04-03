"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Layers, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/providers/AccountContext";

export function AccountSelector() {
    const { accounts, selectedAccount, setSelectedAccount, isLoading } = useAccount();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredAccounts = accounts.filter(account =>
        account.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={cn(
                    "flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 transition-all hover:border-primary hover:shadow-md shadow-sm active:scale-[0.98]",
                    isOpen && "border-primary ring-4 ring-primary/10 shadow-md"
                )}
            >
                <Layers className={cn("h-4 w-4 transition-colors", isOpen ? "text-primary" : "text-foreground")} />
                <span className="text-sm font-bold text-foreground max-w-[200px] truncate">
                    {isLoading ? "Carregando..." : selectedAccount?.name || "Selecionar Conta"}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 z-50 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left">
                    <div className="relative mb-2 px-2 pt-1">
                        <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar conta..."
                            className="w-full rounded-xl border-none bg-muted py-2.5 pl-10 pr-4 text-sm font-medium text-foreground focus:ring-0 placeholder:text-muted-foreground/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto px-1 no-scrollbar">
                        {filteredAccounts.length > 0 ? (
                            <div className="grid gap-1">
                                {filteredAccounts.map((account) => {
                                    const isSelected = selectedAccount?.id === account.id;
                                    return (
                                        <button
                                            key={account.id}
                                            onClick={() => {
                                                setSelectedAccount(account);
                                                setIsOpen(false);
                                                setSearch("");
                                            }}
                                            className={cn(
                                                "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                                                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="text-sm truncate">{account.name}</span>
                                            {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-muted-foreground font-medium">Nenhuma conta encontrada</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
