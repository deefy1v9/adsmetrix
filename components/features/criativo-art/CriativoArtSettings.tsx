"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getCriativoArtKeyAction, saveCriativoArtKeyAction } from "@/actions/criativo-art-actions";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export function CriativoArtSettings() {
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        getCriativoArtKeyAction().then(res => {
            if (res.success) setApiKey(res.apiKey);
            setIsLoading(false);
        });
    }, []);

    async function handleSave() {
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await saveCriativoArtKeyAction(apiKey);
            setMessage(res.success
                ? { type: "success", text: "Chave salva com sucesso!" }
                : { type: "error", text: res.error || "Erro ao salvar." }
            );
        } catch {
            setMessage({ type: "error", text: "Erro interno." });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) return (
        <GlassCard className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </GlassCard>
    );

    return (
        <GlassCard className="space-y-4">
            <div className="flex items-center gap-3">
                <Image
                    src="/criativo-art-logo.svg"
                    alt="Criativo.Art"
                    width={32}
                    height={32}
                    className="rounded-md"
                />
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Criativo.Art</h3>
                    <p className="text-xs text-muted-foreground">Cole sua chave de API do Atlas para gerar criativos.</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Chave de API</label>
                <div className="relative">
                    <Input
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        type={showKey ? "text" : "password"}
                        placeholder="crt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Encontre sua chave em <span className="font-semibold">atlas.intelexia.com.br</span> → Configurações → API Keys.
                </p>
            </div>

            {message && (
                <div className={`text-sm p-2 rounded ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {message.text}
                </div>
            )}

            <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Chave
            </Button>
        </GlassCard>
    );
}
