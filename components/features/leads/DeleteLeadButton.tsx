"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Trash2, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { deleteLeadAction } from "@/actions/meta-actions";

interface DeleteLeadButtonProps {
    leadId: string;
    onDeleted?: () => void;
}

export function DeleteLeadButton({ leadId, onDeleted }: DeleteLeadButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function handleDelete() {
        setIsDeleting(true);
        setStatusMessage(null);
        try {
            const result = await deleteLeadAction(leadId);
            if (result.success) {
                setStatusMessage({ type: 'success', text: 'Lead excluído com sucesso!' });
                setTimeout(() => {
                    setIsOpen(false);
                    if (onDeleted) onDeleted();
                }, 1000);
            } else {
                setStatusMessage({ type: 'error', text: result.error || 'Erro ao excluir lead.' });
                setIsDeleting(false);
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Ocorreu um erro inesperado.' });
            setIsDeleting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 group-hover:opacity-100 opacity-50 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Excluir Lead
                    </DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir este lead permanentemente? Esta ação não pode ser desfeita e os dados serão removidos do banco de dados.
                    </DialogDescription>
                </DialogHeader>

                {statusMessage && (
                    <div className={`text-sm p-3 rounded border ${statusMessage.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        {statusMessage.text}
                    </div>
                )}

                <DialogFooter className="mt-4 flex gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Excluindo
                            </>
                        ) : (
                            'Confirmar Exclusão'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
