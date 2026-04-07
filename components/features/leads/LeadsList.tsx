"use client";

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
import { Input } from "@/components/ui/Input";
import {
    Search, MessageSquare,
    Link as LinkIcon, RefreshCw, Loader2
} from "lucide-react";
import { useAccount } from "@/components/providers/AccountContext";
import { useEffect, useState } from "react";
import { fetchLeadsAction, syncAllLeadsAction } from "@/actions/meta-actions";
import { MetaLead } from "@/lib/balance-utils";
import { CustomWebhookDialog } from "../accounts/CustomWebhookDialog";
import { CreateLeadDialog } from "./CreateLeadDialog";
import { DeleteLeadButton } from "./DeleteLeadButton";

export function LeadsList() {
    const { selectedAccount } = useAccount();
    const [leads, setLeads] = useState<MetaLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    async function loadLeads(sync: boolean = false) {
        if (!selectedAccount) return;

        // Show main loader only if we have no leads yet
        if (leads.length === 0) setLoading(true);

        try {
            // 1. Always load from DB first to be fast
            const dbLeads = await fetchLeadsAction(selectedAccount.id, false);
            setLeads(dbLeads);
            setLoading(false);

            // 2. If sync is true (auto or manual), do background sync
            if (sync) {
                setIsSyncing(true);
                const freshLeads = await fetchLeadsAction(selectedAccount.id, true);
                setLeads(freshLeads);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    }


    useEffect(() => {
        setLeads([]); // Clear when account changes
        setCurrentPage(1); // Reset page
        loadLeads(true); // Auto sync on enter
    }, [selectedAccount]);

    // Pagination logic
    const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentLeads = leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Helpers for beautification
    const formatLabel = (label: string) => {
        return label
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\?$/, '');
    };

    const isContactField = (name: string) => {
        const n = name.toLowerCase();
        return n.includes('email') || n.includes('phone') || n.includes('telefone') || n.includes('full_name') || n.includes('nome');
    };

    return (
        <GlassCard>
            {/* Toolbar */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                    <Input icon={Search} placeholder="Buscar leads..." />
                </div>
                <div className="flex gap-2">
                    {selectedAccount && (
                        <>
                            <CreateLeadDialog
                                accountId={selectedAccount.id}
                                onSuccess={() => loadLeads(false)}
                            />
                            <CustomWebhookDialog
                                accountId={selectedAccount.id}
                                currentWebhookId={(selectedAccount as any).custom_webhook_id}
                                onUpdate={() => loadLeads(false)}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-center mb-6">
                <button
                    onClick={() => loadLeads(true)}
                    disabled={isSyncing}
                    className="flex items-center gap-2"
                >
                    <Badge variant={isSyncing ? "warning" : "neon"} className="gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Sincronizando leads..." : "Sincronizar leads"}
                    </Badge>
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 animate-spin text-green-500 transition-all" />
                    <span className="text-sm font-medium animate-pulse">Consultando banco de dados...</span>
                </div>
            ) : leads.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-xl text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">
                        {isSyncing ? "Buscando primeiros leads..." : "Nenhum lead encontrado para esta conta."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {currentLeads.map((lead) => {
                        const name = lead.field_data.find(f => f.name.includes('full_name') || f.name.includes('nome'))?.values[0] || 'Lead Sem Nome';
                        const email = lead.field_data.find(f => f.name.includes('email'))?.values[0];
                        const phone = lead.field_data.find(f => f.name.includes('phone') || f.name.includes('telefone'))?.values[0];
                        const customFields = lead.field_data.filter(f => !isContactField(f.name));


                        // Calculate initials
                        const initials = name
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                        return (
                            <div key={lead.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300">
                                {/* Side Accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />

                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Left: Contact Info */}
                                    <div className="shrink-0 lg:w-3/12 space-y-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-foreground text-lg leading-tight truncate" title={name}>
                                                    {name}
                                                </h3>
                                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
                                                    ID: {lead.id.slice(-8)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {email && (
                                                <div className="flex items-center gap-3 group/link cursor-pointer hover:text-primary transition-colors" onClick={() => window.location.href = `mailto:${email}`}>
                                                    <div className="bg-muted p-1.5 rounded-full border border-border">
                                                        <Search className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                    <span className="text-sm font-medium text-muted-foreground truncate">{email}</span>
                                                </div>
                                            )}
                                            {lead.platform === 'custom_webhook' && lead.ad_name && (
                                                <div className="flex items-center gap-3 group/link cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                                    if (lead.ad_name && lead.ad_name.startsWith('http')) {
                                                        window.open(lead.ad_name, '_blank');
                                                    }
                                                }}>
                                                    <div className="bg-muted p-1.5 rounded-full border border-border">
                                                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                    <span className="text-xs font-medium text-muted-foreground truncate" title={lead.ad_name}>
                                                        Origem: {(() => {
                                                            try {
                                                                return lead.ad_name.startsWith('http') ? new URL(lead.ad_name).hostname.replace('www.', '') : lead.ad_name;
                                                            } catch {
                                                                return lead.ad_name;
                                                            }
                                                        })()}
                                                    </span>
                                                </div>
                                            )}
                                            {phone && (
                                                <div className="flex items-center gap-3 group/link cursor-pointer hover:text-primary transition-colors">
                                                    <div className="bg-primary/5 p-1.5 rounded-full border border-primary/20">
                                                        <MessageSquare className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground">{phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-border flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="neutral" className="bg-muted border-border text-muted-foreground">
                                                    {new Date(lead.created_time).toLocaleDateString('pt-BR')} às {new Date(lead.created_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </Badge>
                                            </div>

                                            <div className="flex justify-end pt-2 border-t border-border mt-2">
                                                <DeleteLeadButton
                                                    leadId={lead.id}
                                                    onDeleted={() => loadLeads(false)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Form Responses */}
                                    <div className="grow lg:w-9/12">
                                        <div className="bg-muted/50 rounded-xl border border-border p-5 h-full">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                                {customFields.map((field, i) => (
                                                    <div key={i} className="flex flex-col gap-2 group/field">
                                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                            {formatLabel(field.name)}
                                                        </div>
                                                        <div className="text-sm text-foreground font-semibold leading-relaxed">
                                                            {field.values.join(', ')}
                                                        </div>
                                                    </div>
                                                ))}
                                                {customFields.length === 0 && (
                                                    <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground italic text-sm">
                                                        Sem respostas personalizadas
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {leads.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-xs text-muted-foreground">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, leads.length)} de {leads.length} leads
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="h-8 border-border hover:bg-accent text-xs"
                        >
                            Anterior
                        </Button>
                        <div className="flex items-center px-3 text-xs text-muted-foreground border border-border rounded-md bg-muted/50">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="h-8 border-border hover:bg-accent text-xs"
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            )}
        </GlassCard>
    );
}
