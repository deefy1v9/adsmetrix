import { useState } from "react";
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
import { EditAccountDialog } from "./EditAccountDialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { EyeOff } from "lucide-react";

interface OverviewData {
    id: string;
    name: string;
    client_name: string;
    balance: number;
    amount_spent: number;
    currency: string;
    leads24h: number;
    leadsMonth: number;
    lastCharge: string;
    is_prepay: boolean;
    spend_cap: number;
}

interface OverviewTableProps {
    data: OverviewData[];
    loading?: boolean;
}

export function OverviewTable({ data, loading }: OverviewTableProps) {
    const [editingAccount, setEditingAccount] = useState<OverviewData | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isHidingBulk, setIsHidingBulk] = useState(false);

    const toggleSelectAll = () => {
        if (selectedIds.size === data.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(data.map(item => item.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkHide = async () => {
        if (selectedIds.size === 0) return;
        if (confirm(`Deseja realmente ocultar as ${selectedIds.size} contas selecionadas?`)) {
            setIsHidingBulk(true);
            try {
                const { bulkToggleAccountVisibilityAction } = await import("@/actions/overview-actions");
                await bulkToggleAccountVisibilityAction(Array.from(selectedIds), true);
                window.location.reload();
            } catch (e) {
                console.error(e);
                setIsHidingBulk(false);
            }
        }
    };

    const totals = data.reduce((acc, item) => ({
        leadsMonth: acc.leadsMonth + item.leadsMonth,
    }), { leadsMonth: 0 });

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: currency,
        }).format(value);
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-400">Carregando dados da visão geral...</div>;
    }

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-3 border border-border bg-card/50 backdrop-blur-sm rounded-xl animate-in slide-in-from-top-2 fade-in">
                    <span className="text-sm font-bold text-foreground">
                        {selectedIds.size} {selectedIds.size === 1 ? 'conta selecionada' : 'contas selecionadas'}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={handleBulkHide}
                        disabled={isHidingBulk}
                    >
                        <EyeOff className="h-4 w-4" />
                        {isHidingBulk ? 'Ocultando...' : 'Ocultar Selecionadas'}
                    </Button>
                </div>
            )}

            <GlassCard className="border-border overflow-visible">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="w-[40px] text-center">
                                <Checkbox
                                    checked={data.length > 0 && selectedIds.size === data.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Selecionar todas as contas"
                                />
                            </TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-12">Cliente</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-12 text-center">Última Recarga</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-12 text-center">Saldo Disponível</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-12 text-center">Leads (Mês)</TableHead>
                            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-12 text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted transition-colors group">
                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={selectedIds.has(item.id)}
                                        onCheckedChange={() => toggleSelect(item.id)}
                                        aria-label={`Selecionar ${item.client_name}`}
                                    />
                                </TableCell>
                                <TableCell className="py-5">
                                    <div className="font-bold text-foreground text-sm">{item.client_name}</div>
                                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">ID: {item.id.slice(-8)}</div>
                                </TableCell>
                                <TableCell className="py-5 text-center text-xs font-medium text-muted-foreground">
                                    {item.lastCharge}
                                </TableCell>
                                <TableCell className="py-5 text-center">
                                    {item.is_prepay ? (
                                        item.balance > 0 ? (
                                            <Badge variant="neon" className="px-3 py-1 font-black text-[11px]">
                                                {formatCurrency(item.balance, item.currency)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="danger" className="px-3 py-1 font-black text-[11px]">
                                                {formatCurrency(item.balance, item.currency)}
                                            </Badge>
                                        )
                                    ) : (
                                        <Badge variant="neon" className="px-3 py-1 font-black text-[11px]">
                                            Cobrança em cartão
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="py-5 text-center">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border text-sm font-black text-foreground">
                                        {item.leadsMonth}
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border hover:border-primary hover:text-foreground text-muted-foreground transition-all shadow-sm"
                                            title="Editar"
                                            onClick={() => setEditingAccount(item)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        </button>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border hover:border-red-500 hover:text-red-600 text-muted-foreground transition-all shadow-sm"
                                            title="Ocultar"
                                            onClick={async () => {
                                                if (confirm(`Deseja realmente ocultar a conta ${item.client_name}?`)) {
                                                    const { toggleAccountVisibilityAction } = await import("@/actions/overview-actions");
                                                    await toggleAccountVisibilityAction(item.id, true);
                                                    window.location.reload();
                                                }
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <tfoot>
                        <TableRow className="hover:bg-transparent border-t-2 border-[#1A1A1A]">
                            <TableCell colSpan={4} className="py-6 text-right font-black text-foreground uppercase tracking-widest text-xs">Total Consolidado</TableCell>
                            <TableCell className="py-6 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-black font-black text-lg shadow-lg shadow-primary/20">
                                    {totals.leadsMonth}
                                </div>
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </tfoot>
                </Table>
            </GlassCard>

            {editingAccount && (
                <EditAccountDialog
                    accountId={editingAccount.id}
                    accountName={editingAccount.name}
                    clientName={editingAccount.client_name}
                    isOpen={!!editingAccount}
                    onClose={() => setEditingAccount(null)}
                    onSuccess={() => window.location.reload()}
                />
            )}
        </div>
    );
}
