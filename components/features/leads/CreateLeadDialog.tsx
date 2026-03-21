"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createManualLeadAction } from "@/actions/meta-actions";
import { UserPlus, Loader2 } from "lucide-react";

interface CreateLeadDialogProps {
    accountId: string;
    onSuccess?: () => void;
}

export function CreateLeadDialog({ accountId, onSuccess }: CreateLeadDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        if (!name || !phone) {
            setError("Nome e Telefone são obrigatórios.");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const res = await createManualLeadAction(accountId, { name, email, phone });
            if (res.success) {
                setIsOpen(false);
                setName("");
                setEmail("");
                setPhone("");
                if (onSuccess) onSuccess();
            } else {
                setError(res.error || "Erro ao salvar lead.");
            }
        } catch (e: any) {
            setError("Erro interno.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary">
                    <UserPlus className="h-4 w-4" />
                    Novo Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>Cadastrar Lead Manualmente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="lead-name">Nome Completo</label>
                        <Input
                            id="lead-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João Silva"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="lead-email">E-mail</label>
                        <Input
                            id="lead-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="joao@exemplo.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="lead-phone">Telefone / WhatsApp</label>
                        <Input
                            id="lead-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="5511999999999"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Inclua o DDI (55) e o DDD.</p>
                    </div>

                    {error && (
                        <div className="text-sm p-2 rounded bg-destructive/10 text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Lead"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
