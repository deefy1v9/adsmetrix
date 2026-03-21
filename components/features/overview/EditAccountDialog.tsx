"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateAccountAction } from "@/actions/overview-actions";
import { Loader2 } from "lucide-react";

interface EditAccountDialogProps {
    accountId: string;
    accountName: string;
    clientName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditAccountDialog({ accountId, accountName, clientName, isOpen, onClose, onSuccess }: EditAccountDialogProps) {
    const [name, setName] = useState(clientName || accountName);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        setIsSaving(true);
        setError(null);
        try {
            const res = await updateAccountAction(accountId, { client_name: name });
            if (res.success) {
                onSuccess();
                onClose();
            } else {
                setError(res.error || "Erro ao salvar.");
            }
        } catch (e) {
            setError("Erro interno.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>Editar Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Ajuste o nome de exibição para a conta <strong>{accountName}</strong>.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nome do Cliente / Conta</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Nome da Empresa / Cliente"
                            className="bg-muted border-border"
                        />
                    </div>
                    {error && (
                        <div className="text-sm text-red-400 bg-red-400/10 p-2 rounded">
                            {error}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
