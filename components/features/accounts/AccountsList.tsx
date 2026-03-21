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
import { Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import { MetaAdAccount } from "@/lib/balance-utils";
import { useDate } from "@/components/providers/DateContext";

const statusMap: Record<number, "success" | "danger" | "warning"> = {
    1: "success",   // ACTIVE
    2: "danger",    // DISABLED
    3: "warning",   // UNSETTLED (example, Meta has various statuses)
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
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await fetchAdAccountsAction();
                setAccounts(data);
                if (data.length === 0) {
                    console.log("No accounts returned from action");
                }
            } catch (err) {
                console.error("Failed to load accounts:", err);
                setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar contas");
            } finally {
                setIsLoading(false);
            }
        }
        loadAccounts();
    }, []);

    if (isLoading) {
        return (
            <GlassCard>
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
                                <TableCell>
                                    <Skeleton className="h-4 w-40 mb-1" />
                                    <Skeleton className="h-3 w-24" />
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Skeleton className="h-8 w-24 rounded-md" />
                                        <Skeleton className="h-8 w-24 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </GlassCard>
        );
    }

    if (error) {
        return (
            <GlassCard className="border-destructive/50 bg-destructive/5">
                <div className="p-6 text-center">
                    <div className="text-destructive font-medium mb-2">Erro ao carregar contas</div>
                    <div className="text-muted-foreground text-sm">{error}</div>
                    <p className="mt-4 text-xs text-muted-foreground/60">
                        Verifique se o token no arquivo .env é válido e possui a permissão 'ads_read'.
                    </p>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard>
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
                                    <div>
                                        <div className="font-medium text-foreground">{account.name}</div>
                                        <div className="text-xs text-muted-foreground">{account.id}</div>
                                    </div>
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
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent hover:text-primary">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </GlassCard>
    );
}
