"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, Download, Copy, CheckCheck, ImageIcon, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const FORMATS = [
    { value: "1:1", label: "1:1", desc: "Feed quadrado" },
    { value: "9:16", label: "9:16", desc: "Stories / Reels" },
    { value: "16:9", label: "16:9", desc: "Horizontal" },
    { value: "4:5", label: "4:5", desc: "Feed retrato" },
];

interface GeneratedCreative {
    image_url: string;
    external_id?: string;
    credits_used?: number;
    prompt: string;
    format: string;
    title?: string;
    generatedAt: string;
}

const HISTORY_KEY = "criativo_art_history";

function loadHistory(): GeneratedCreative[] {
    try {
        return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveHistory(items: GeneratedCreative[]) {
    try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 5)));
    } catch {}
}

export function CriativoArtUI({ onCreditsUpdate }: { onCreditsUpdate?: (credits: number) => void }) {
    const [prompt, setPrompt] = useState("");
    const [format, setFormat] = useState("1:1");
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [referenceUrl, setReferenceUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GeneratedCreative | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<GeneratedCreative[]>([]);
    const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim() || loading) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const body: Record<string, any> = {
                prompt: prompt.trim(),
                format,
            };
            if (title.trim()) body.title = title.trim();
            if (subtitle.trim()) body.subtitle = subtitle.trim();
            if (referenceUrl.trim()) body.reference_image_url = referenceUrl.trim();

            const res = await fetch("/api/criativo-art", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Erro ao gerar criativo.");
                return;
            }

            // Tenta múltiplos campos possíveis na resposta da API
            // A API Atlas retorna: { success, data: { image_url, ... } }
            const imageUrl: string =
                data.data?.image_url ||
                data.data?.url ||
                data.image_url ||
                data.url ||
                data.imageUrl ||
                data.image ||
                data.output ||
                data.result?.url ||
                data.result?.image_url ||
                "";

            if (!imageUrl) {
                setError(`Campo de imagem não encontrado. Resposta recebida: ${JSON.stringify(data)}`);
                return;
            }

            const inner = data.data || data;
            const remaining = inner.credits_remaining?.[0]?.new_balance ?? inner.credits_remaining ?? null;
            if (remaining !== null) {
                setCreditsBalance(remaining);
                onCreditsUpdate?.(remaining);
            }

            const newCreative: GeneratedCreative = {
                image_url: imageUrl,
                external_id: inner.id || inner.external_id,
                credits_used: remaining ?? inner.credits_used,
                prompt: prompt.trim(),
                format,
                title: title.trim() || undefined,
                generatedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            };

            setResult(newCreative);

            const newHistory = [newCreative, ...history].slice(0, 5);
            setHistory(newHistory);
            saveHistory(newHistory);
        } catch (err: any) {
            setError(err.message || "Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (url: string) => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Gerar Criativo
                            </CardTitle>
                            <CardDescription>
                                Descreva o criativo e a IA gerará uma imagem pronta para usar em anúncios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Prompt */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Descrição do Criativo <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder='Ex: "Produto de beleza premium, fundo branco clean, iluminação suave, estilo minimalista"'
                                    className="resize-none min-h-[100px]"
                                />
                            </div>

                            {/* Format */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formato</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {FORMATS.map(f => (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onClick={() => setFormat(f.value)}
                                            className={cn(
                                                "flex flex-col items-center px-3 py-2.5 rounded-md border text-center transition-colors",
                                                format === f.value
                                                    ? "bg-primary/10 border-primary text-foreground"
                                                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                                            )}
                                        >
                                            <span className="text-sm font-bold">{f.label}</span>
                                            <span className="text-[10px]">{f.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title + Subtitle */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título (opcional)</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Ex: Transforme sua pele"
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtítulo (opcional)</label>
                                    <input
                                        type="text"
                                        value={subtitle}
                                        onChange={e => setSubtitle(e.target.value)}
                                        placeholder="Ex: Resultados em 7 dias"
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                                    />
                                </div>
                            </div>

                            {/* Reference Image URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL de Imagem de Referência (opcional)</label>
                                <input
                                    type="url"
                                    value={referenceUrl}
                                    onChange={e => setReferenceUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                className="w-full"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando criativo...</>
                                ) : (
                                    <><Sparkles className="mr-2 h-4 w-4" /> Gerar Criativo</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Result */}
                    {result && (
                        <Card className="border-primary/30 bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-primary" />
                                    Criativo Gerado
                                    {result.credits_used !== undefined && (
                                        <span className="ml-auto text-[11px] text-muted-foreground font-normal">
                                            {result.credits_used} crédito{result.credits_used !== 1 ? "s" : ""} usado{result.credits_used !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="relative rounded-lg overflow-hidden bg-muted/30 border border-border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={result.image_url}
                                        alt="Criativo gerado"
                                        className="w-full object-contain max-h-[500px]"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleCopy(result.image_url)}
                                    >
                                        {copied ? (
                                            <><CheckCheck className="mr-2 h-4 w-4 text-green-500" /> Copiado!</>
                                        ) : (
                                            <><Copy className="mr-2 h-4 w-4" /> Copiar URL</>
                                        )}
                                    </Button>
                                    <a
                                        href={result.image_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1"
                                    >
                                        <Button variant="outline" className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    </a>
                                </div>
                                <div className="text-[11px] text-muted-foreground break-all">
                                    <span className="font-semibold">URL:</span> {result.image_url}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* History sidebar */}
                <div className="space-y-4">
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Histórico da Sessão
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    Nenhum criativo gerado nesta sessão.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((item, i) => (
                                        <div
                                            key={i}
                                            className="rounded-md overflow-hidden border border-border cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => setResult(item)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.image_url}
                                                alt="preview"
                                                className="w-full h-24 object-cover"
                                            />
                                            <div className="p-2">
                                                <div className="text-[10px] text-muted-foreground truncate">{item.prompt}</div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <span className="text-[10px] font-semibold text-primary">{item.format}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.generatedAt}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
