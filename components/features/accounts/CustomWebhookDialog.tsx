"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { Copy, RefreshCw, Zap, ShieldAlert, Check } from "lucide-react";
import { generateCustomWebhookAction } from "@/actions/meta-actions";

interface CustomWebhookDialogProps {
    accountId: string;
    currentWebhookId?: string | null;
    onUpdate?: () => void;
}

export function CustomWebhookDialog({ accountId, currentWebhookId, onUpdate }: CustomWebhookDialogProps) {
    const [open, setOpen] = useState(false);
    const [webhookId, setWebhookId] = useState(currentWebhookId || "");
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'wordpress' | 'criativoart'>('wordpress');

    // In a real environment you probably want to use the absolute origin.
    // Assuming standard deployment or current host.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fullWebhookUrl = webhookId ? `${baseUrl}/api/webhooks/custom/${webhookId}` : '';

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const res = await generateCustomWebhookAction(accountId);
            if (res.success && res.webhookId) {
                setWebhookId(res.webhookId);
                if (onUpdate) onUpdate();
            } else {
                throw new Error(res.error || "Erro desconhecido");
            }
        } catch (error: any) {
            alert(`Erro ao gerar webhook: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!fullWebhookUrl) return;
        try {
            await navigator.clipboard.writeText(fullWebhookUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert("Falha ao copiar. Tente selecionar o texto manualmente.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Webhook
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Webhook de Captura (Externa)
                    </DialogTitle>
                    <DialogDescription>
                        Receba leads de formulários externos e plataformas de marketing copiando a URL abaixo para o seu sistema de origem.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {!webhookId ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed border-border gap-4 text-center">
                            <ShieldAlert className="w-10 h-10 text-muted-foreground" />
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Nenhuma Webhook Gerada</h4>
                                <p className="text-xs text-muted-foreground uppercase opacity-80">
                                    Esta conta ainda não possui uma rota de recebimento exclusiva.
                                </p>
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full sm:w-auto mt-2 bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {isLoading ? (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="mr-2 h-4 w-4" />
                                )}
                                Gerar URL Exclusiva
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex bg-muted/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('wordpress')}
                                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'wordpress' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    WordPress / Elementor
                                </button>
                                <button
                                    onClick={() => setActiveTab('criativoart')}
                                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'criativoart' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Criativo Art
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    URL ({activeTab === 'wordpress' ? 'WordPress' : 'Criativo Art'})
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={fullWebhookUrl}
                                        className="font-mono text-xs bg-muted/50 truncate pr-2 border-primary/20"
                                    />
                                    <Button size="icon" variant="secondary" onClick={handleCopy} className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {activeTab === 'wordpress' ? (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border space-y-2">
                                        <p>Para o <strong>Elementor Forms</strong> ou <strong>Typeform</strong>, cole a url acima para enviar os dados por Webhook.</p>
                                        <p>Certifique-se de que os campos do seu formulário correspondam a:</p>
                                        <ul className="list-disc list-inside ml-2 space-y-1 text-[11px] font-mono mt-1">
                                            <li><span className="text-primary font-semibold">name</span> ou <span className="text-primary font-semibold">full_name</span></li>
                                            <li><span className="text-primary font-semibold">email</span></li>
                                            <li><span className="text-primary font-semibold">phone</span> ou <span className="text-primary font-semibold">whatsapp</span></li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border space-y-2">
                                        <p>Para a plataforma <strong>Criativo Art</strong>, basta colar a URL acima.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 p-3 bg-card border border-border rounded-md text-xs text-muted-foreground flex items-start gap-2">
                                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                                <p>
                                    Mantenha este link seguro. Qualquer sistema que enviar dados POST para esta URL registrar\u00e1 um lead nesta conta de an\u00fancios.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between items-center">
                    {webhookId ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Regerar e Invalidar URL Atual
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
