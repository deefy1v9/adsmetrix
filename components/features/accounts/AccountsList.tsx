"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EyeOff, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdAccountsAction, toggleAccountHiddenAction } from "@/actions/meta-actions";
import { MetaAdAccount } from "@/lib/balance-utils";

const statusMap: Record<number, "success" | "danger" | "warning"> = {
    1: "success",
    2: "danger",
    3: "warning",
};

const statusNameMap: Record<number, string> = {
    1: "ACTIVE",
    2: "DISABLED",
    3: "UNSETTLED",
    7: "PENDING_REVIEW",
    8: "PENDING_SETTLEMENT",
    9: "DELETED",
    101: "CLOSED",
    201: "TEMPORARY_HOLD"
};

export function AccountsList() {
    // Visible accounts (is_hidden = false) from the action
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    // Hidden accounts fetched separately from DB
    const [hiddenAccounts, setHiddenAccounts] = useState<{ account_id: string; account_name: string }[]>([]);
    const [showHidden, setShowHidden] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    async function load() {
        try {
            setIsLoading(true);
            const [visible, hidden] = await Promise.all([
                fetchAdAccountsAction(),
                fetch('/api/accounts/hidden').then(r => r.json()).catch(() => []),
            ]);
            setAccounts(visible);
            setHiddenAccounts(hidden);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar contas");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const hideAccount = async (accountId: string) => {
        setTogglingId(accountId);
        await toggleAccountHiddenAction(accountId, true);
        await load();
        setTogglingId(null);
    };

    const restoreAccount = async (accountId: string) => {
        setTogglingId(accountId);
        await toggleAccountHiddenAction(accountId, false);
        await load();
        setTogglingId(null);
    };

    if (isLoading) {
        return (
            <GlassCard>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Conta</TableHead>
                                <TableHead>Moeda</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Total Gasto</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </GlassCard>
        );
    }

    if (error) {
        return (
            <GlassCard className="border-destructive/50 bg-destructive/5">
                <div className="p-6 text-center">
                    <div className="text-destructive font-medium mb-2">Erro ao carregar contas</div>
                    <div className="text-muted-foreground text-sm">{error}</div>
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-4">
            <GlassCard>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Conta</TableHead>
                                <TableHead>Moeda</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Total Gasto</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhuma conta de anúncio encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{account.name}</div>
                                            <div className="text-xs text-muted-foreground">{account.id}</div>
                                        </TableCell>
                                        <TableCell>{account.currency}</TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: account.currency }).format(account.balance || 0)}
                                        </TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: account.currency }).format(account.amount_spent || 0)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusMap[account.account_status] || "neutral"}>
                                                {statusNameMap[account.account_status] || `STATUS_${account.account_status}`}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-zinc-400 hover:text-red-400 gap-1.5"
                                                disabled={togglingId === account.id}
                                                onClick={() => hideAccount(account.id)}
                                            >
                                                <EyeOff className="h-4 w-4" />
                                                Ocultar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </GlassCard>

            {/* Hidden accounts section */}
            {hiddenAccounts.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowHidden(v => !v)}
                        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        {showHidden ? "Ocultar" : `Ver contas ocultas (${hiddenAccounts.length})`}
                    </button>

                    {showHidden && (
                        <GlassCard className="border-zinc-800/40">
                            <Table>
                                <TableBody>
                                    {hiddenAccounts.map(acc => (
                                        <TableRow key={acc.account_id} className="opacity-60">
                                            <TableCell>
                                                <div className="font-medium text-zinc-400">{acc.account_name}</div>
                                                <div className="text-xs text-zinc-600">{acc.account_id}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-zinc-500 hover:text-green-400 gap-1.5"
                                                    disabled={togglingId === acc.account_id}
                                                    onClick={() => restoreAccount(acc.account_id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Restaurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </GlassCard>
                    )}
                </div>
            )}
        </div>
    );
}
