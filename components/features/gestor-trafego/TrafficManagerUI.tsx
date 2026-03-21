"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Bot, Send, Rocket, BarChart2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ImageIcon, ChevronDown, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/providers/AccountContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

type Message = { role: "user" | "ai"; content: string };

interface AdSetConfig {
    name: string;
    interests: string[];
    age_min: number;
    age_max: number;
    countries: string[];
    excluded_regions: string[];
    destination_type: string;
    optimization_goal: string;
    advantage_audience: number; // 0 = manual, 1 = Advantage+
    page_id?: string;
    bid_strategy: string;  // ABO only: LOWEST_COST_WITHOUT_CAP | LOWEST_COST_WITH_BID_CAP | TARGET_COST
    bid_amount?: number;   // required when bid_strategy != LOWEST_COST_WITHOUT_CAP (value in R$)
    creative_image_url?: string;
    ad_name?: string;
    ad_headline?: string;
    ad_body?: string;
    ad_destination_url?: string;
    ad_cta_type?: string;
}

interface CampaignParams {
    name: string;
    objective: string;
    daily_budget: number;
    budget_type: 'ABO' | 'CBO';
    bid_strategy: string;  // CBO only: campaign-level bid strategy
    bid_amount?: number;   // CBO only: required when bid_strategy != LOWEST_COST_WITHOUT_CAP
    special_ad_categories: string[];
    ad_sets?: AdSetConfig[];
    page_id?: string;
}

const CTA_TYPES = [
    { value: 'LEARN_MORE', label: 'Saiba mais' },
    { value: 'SIGN_UP', label: 'Cadastre-se' },
    { value: 'CONTACT_US', label: 'Fale conosco' },
    { value: 'GET_QUOTE', label: 'Solicitar orçamento' },
    { value: 'SHOP_NOW', label: 'Comprar' },
    { value: 'APPLY_NOW', label: 'Candidatar-se' },
    { value: 'DOWNLOAD', label: 'Baixar' },
];

const BID_STRATEGIES = [
    { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Volume mais alto', desc: 'Gaste o orçamento para obter o maior número de resultados' },
    { value: 'TARGET_COST', label: 'Meta de custo por resultado', desc: 'Mantenha o custo médio próximo ao valor definido' },
    { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Limite de lance', desc: 'Outras opções — define o valor máximo de lance por leilão' },
];

const OBJECTIVE_LABELS: Record<string, string> = {
    OUTCOME_LEADS: "Geração de Leads",
    OUTCOME_TRAFFIC: "Tráfego",
    OUTCOME_AWARENESS: "Reconhecimento de Marca",
    OUTCOME_SALES: "Vendas / Conversões",
    OUTCOME_ENGAGEMENT: "Engajamento",
};

// Conversion locations per objective
const CONVERSION_LOCATIONS: Record<string, { value: string; label: string }[]> = {
    OUTCOME_LEADS: [
        { value: 'WEBSITE', label: 'Site' },
        { value: 'ON_AD', label: 'Formulários instantâneos' },
        { value: 'WHATSAPP', label: 'WhatsApp' },
        { value: 'MESSENGER', label: 'Messenger' },
        { value: 'INSTAGRAM_DIRECT', label: 'Instagram' },
        { value: 'PHONE_CALL', label: 'Ligações' },
    ],
    OUTCOME_TRAFFIC: [
        { value: 'WEBSITE', label: 'Site' },
        { value: 'MESSENGER', label: 'Messenger' },
        { value: 'INSTAGRAM_DIRECT', label: 'Instagram' },
        { value: 'WHATSAPP', label: 'WhatsApp' },
        { value: 'APP', label: 'App' },
    ],
    OUTCOME_SALES: [
        { value: 'WEBSITE', label: 'Site' },
        { value: 'WHATSAPP', label: 'WhatsApp' },
        { value: 'MESSENGER', label: 'Messenger' },
        { value: 'APP', label: 'App' },
    ],
    OUTCOME_AWARENESS: [],
    OUTCOME_ENGAGEMENT: [],
};

// Performance goals per conversion location
const OPTIMIZATION_GOALS: Record<string, { value: string; label: string }[]> = {
    WEBSITE: [
        { value: 'LINK_CLICKS', label: 'Maximizar cliques no link' },
        { value: 'LANDING_PAGE_VIEWS', label: 'Maximizar visualizações da página de destino' },
    ],
    ON_AD: [
        { value: 'LEAD_GENERATION', label: 'Maximizar leads' },
        { value: 'QUALITY_LEAD', label: 'Maximizar leads de qualidade' },
    ],
    WHATSAPP: [{ value: 'CONVERSATIONS', label: 'Maximizar conversas' }],
    MESSENGER: [{ value: 'CONVERSATIONS', label: 'Maximizar conversas' }],
    INSTAGRAM_DIRECT: [{ value: 'CONVERSATIONS', label: 'Maximizar conversas' }],
    PHONE_CALL: [{ value: 'CALLS', label: 'Maximizar ligações' }],
    APP: [{ value: 'APP_INSTALLS', label: 'Maximizar instalações do app' }],
};

const DEFAULT_OPT_GOAL: Record<string, string> = {
    WEBSITE: 'LINK_CLICKS',
    ON_AD: 'LEAD_GENERATION',
    WHATSAPP: 'CONVERSATIONS',
    MESSENGER: 'CONVERSATIONS',
    INSTAGRAM_DIRECT: 'CONVERSATIONS',
    PHONE_CALL: 'CALLS',
    APP: 'APP_INSTALLS',
};

function getDefaultAdSetFields(objective: string): Pick<AdSetConfig, 'destination_type' | 'optimization_goal' | 'advantage_audience'> {
    const locs = CONVERSION_LOCATIONS[objective];
    const destination_type = locs?.length ? locs[0].value : 'WEBSITE';
    const optimization_goal = DEFAULT_OPT_GOAL[destination_type] || 'LINK_CLICKS';
    return { destination_type, optimization_goal, advantage_audience: 0 };
}

export function TrafficManagerUI() {
    const { selectedAccount, accounts } = useAccount();
    const [activeTab, setActiveTab] = useState<"strategy" | "publish" | "optimization">("strategy");

    // --- Strategy Tab ---
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Olá! Como o Gestor de Tráfego AI, posso ajudar você a estruturar campanhas, definir públicos ou sugerir criativos. O que vamos vender hoje?" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!prompt.trim() || isLoading) return;
        const userMessage = prompt;
        const updatedMessages: Message[] = [...messages, { role: "user", content: userMessage }];
        setMessages(updatedMessages);
        setPrompt("");
        setIsLoading(true);
        try {
            const response = await fetch("/api/traffic-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: userMessage, mode: "chat", messages: updatedMessages.slice(0, -1) })
            });
            if (!response.ok) throw new Error("Falha ao comunicar com a IA");
            const data = await response.json();
            setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        } catch {
            setMessages(prev => [...prev, { role: "ai", content: "Desculpe, ocorreu um erro ao processar sua solicitação." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Publish Tab ---
    const [publishPrompt, setPublishPrompt] = useState("");
    const [publishLoading, setPublishLoading] = useState(false);
    const [campaignParams, setCampaignParams] = useState<CampaignParams | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
    const [createdAdSetIds, setCreatedAdSetIds] = useState<string[]>([]);
    const [adSetErrors, setAdSetErrors] = useState<string[]>([]);
    const [createError, setCreateError] = useState<string | null>(null);
    const [selectedPublishAccountId, setSelectedPublishAccountId] = useState<string>("");
    const [customToken, setCustomToken] = useState("");
    const [showToken, setShowToken] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
    const [adSetStep, setAdSetStep] = useState(0);
    const [creativeExpanded, setCreativeExpanded] = useState(false);
    const [creativeTab, setCreativeTab] = useState<'recent' | 'generate' | 'url'>('recent');
    const [creativePrompt, setCreativePrompt] = useState("");
    const [creativeFormat, setCreativeFormat] = useState("1:1");
    const [creativeGenerating, setCreativeGenerating] = useState(false);
    const [creativePreviewUrl, setCreativePreviewUrl] = useState<string | null>(null);
    const [creativeError, setCreativeError] = useState<string | null>(null);
    const [creativeCopied, setCreativeCopied] = useState(false);
    const [createdAdIds, setCreatedAdIds] = useState<string[]>([]);
    const [adErrors, setAdErrors] = useState<string[]>([]);

    useEffect(() => {
        if (selectedAccount && !selectedPublishAccountId) {
            setSelectedPublishAccountId(selectedAccount.id);
        }
    }, [selectedAccount]);


    const updateAdSet = (index: number, updates: Partial<AdSetConfig>) => {
        setCampaignParams(prev => {
            if (!prev) return prev;
            const newAdSets = [...(prev.ad_sets || [])];
            newAdSets[index] = { ...newAdSets[index], ...updates };
            return { ...prev, ad_sets: newAdSets };
        });
    };

    const handleAnalyze = async () => {
        if (!publishPrompt.trim() || publishLoading) return;
        setPublishLoading(true);
        setCampaignParams(null);
        setParseError(null);
        setCreatedCampaignId(null);
        setCreatedAdSetIds([]);
        setAdSetErrors([]);
        setCreateError(null);
        try {
            const response = await fetch("/api/traffic-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: publishPrompt, mode: "create_campaign" })
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                setParseError(data.error || "Erro ao analisar o prompt.");
            } else {
                const objective = data.campaignParams.objective || 'OUTCOME_LEADS';
                const defaults = getDefaultAdSetFields(objective);
                setCampaignParams({
                    ...data.campaignParams,
                    daily_budget: Number(data.campaignParams.daily_budget),
                    budget_type: 'ABO',
                    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
                    ad_sets: (data.campaignParams.ad_sets || []).map((adSet: any) => ({
                        ...adSet,
                        destination_type: adSet.destination_type || defaults.destination_type,
                        optimization_goal: adSet.optimization_goal || defaults.optimization_goal,
                        advantage_audience: 0,
                        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
                    })),
                });
                setWizardStep(1);
                setAdSetStep(0);
            }
        } catch {
            setParseError("Erro de conexão com a IA.");
        } finally {
            setPublishLoading(false);
        }
    };

    const handleGenerateCreative = async () => {
        setCreativeError("Geração de criativos não disponível.");
    };

    const handleCopyCreativeUrl = async (url: string) => {
        await navigator.clipboard.writeText(url);
        setCreativeCopied(true);
        setTimeout(() => setCreativeCopied(false), 2000);
    };

    const handleCreateCampaign = async () => {
        if (!campaignParams || !selectedPublishAccountId || creating) return;
        setCreating(true);
        setCreateError(null);
        try {
            const response = await fetch("/api/meta/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: selectedPublishAccountId,
                    name: campaignParams.name,
                    objective: campaignParams.objective,
                    budget: campaignParams.daily_budget,
                    specialAdCategories: campaignParams.special_ad_categories,
                    adSets: campaignParams.ad_sets || [],
                    customToken: customToken.trim() || undefined,
                    pageId: campaignParams.page_id?.trim() || undefined,
                    budgetType: campaignParams.budget_type || 'ABO',
                    bidStrategy: campaignParams.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
                    bidAmount: campaignParams.bid_amount || undefined,
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                setCreateError(data.details || data.error || "Falha ao criar campanha.");
            } else {
                setCreatedCampaignId(data.campaignId);
                setCreatedAdSetIds(data.adSetIds || []);
                setAdSetErrors(data.adSetErrors || []);
                setCreatedAdIds(data.adIds || []);
                setAdErrors(data.adErrors || []);
                setCampaignParams(null);
                setPublishPrompt("");
            }
        } catch {
            setCreateError("Erro de conexão com a API do Meta.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar / Tabs */}
            <div className="col-span-1 space-y-2">
                <Button
                    variant={activeTab === "strategy" ? "primary" : "outline"}
                    className={cn("w-full justify-start", activeTab !== "strategy" && "text-muted-foreground")}
                    onClick={() => setActiveTab("strategy")}
                >
                    <Bot className="mr-2 h-4 w-4" />
                    Estratégia de Campanhas
                </Button>
                <Button
                    variant={activeTab === "publish" ? "primary" : "outline"}
                    className={cn("w-full justify-start", activeTab !== "publish" && "text-muted-foreground")}
                    onClick={() => setActiveTab("publish")}
                >
                    <Rocket className="mr-2 h-4 w-4" />
                    Subir Campanhas (Auto)
                </Button>
                <Button
                    variant={activeTab === "optimization" ? "primary" : "outline"}
                    className={cn("w-full justify-start", activeTab !== "optimization" && "text-muted-foreground")}
                    onClick={() => setActiveTab("optimization")}
                >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Otimizações Diárias
                </Button>
            </div>

            {/* Main Content Area */}
            <div className="col-span-1 lg:col-span-3">

                {/* ---- STRATEGY TAB ---- */}
                {activeTab === "strategy" && (
                    <Card className="h-[600px] flex flex-col border-border bg-card">
                        <CardHeader>
                            <CardTitle>Estratégia e Criação</CardTitle>
                            <CardDescription>Alinhe o objetivo, público e criativos da sua campanha usando a inteligência do Claude.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={cn(
                                        "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap",
                                        msg.role === "user"
                                            ? "ml-auto bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground"
                                    )}>
                                        <p>{msg.content}</p>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex flex-col gap-2 rounded-lg px-4 py-3 bg-muted w-48">
                                        <Skeleton className="h-3 w-36" />
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Descreva o que deseja promover, ex: 'Quero vender mentoria para advogados...'"
                                    className="resize-none h-12"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button className="h-full px-6" onClick={handleSendMessage} disabled={isLoading || !prompt.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ---- PUBLISH TAB ---- */}
                {activeTab === "publish" && (
                    <Card className="flex flex-col border-border bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-primary" />
                                Subir Campanha via IA
                            </CardTitle>
                            <CardDescription>
                                Descreva a campanha. A IA preenche os campos automaticamente — você ajusta e confirma antes de criar.
                                <span className="block mt-1 text-yellow-500 font-medium">⚠️ Todas as campanhas são criadas como PAUSADAS para revisão antes de ativar.</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">

                            {/* Token de Acesso */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Token de Acesso (opcional)</label>
                                <div className="relative">
                                    <input
                                        type={showToken ? "text" : "password"}
                                        value={customToken}
                                        onChange={e => setCustomToken(e.target.value)}
                                        placeholder="EAAxxxxxxx... (deixe em branco para usar o token salvo da conta)"
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(v => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Account Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conta de Anúncios</label>
                                <select
                                    value={selectedPublishAccountId}
                                    onChange={e => setSelectedPublishAccountId(e.target.value)}
                                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Selecione uma conta...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Prompt Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descreva a Campanha</label>
                                <Textarea
                                    value={publishPrompt}
                                    onChange={e => setPublishPrompt(e.target.value)}
                                    placeholder='Ex: "Campanha de leads para curso de inglês, público feminino 25-45 anos, orçamento de R$50 por dia"'
                                    className="resize-none min-h-[80px]"
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnalyze(); }
                                    }}
                                />
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={publishLoading || !publishPrompt.trim() || !selectedPublishAccountId}
                                    className="w-full"
                                >
                                    {publishLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA...</>
                                    ) : (
                                        <><Bot className="mr-2 h-4 w-4" /> Analisar com IA</>
                                    )}
                                </Button>
                            </div>

                            {/* Parse Error */}
                            {parseError && (
                                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{parseError}</span>
                                </div>
                            )}

                            {/* Loading Skeleton */}
                            {publishLoading && (
                                <GlassCard className="space-y-3 p-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-64" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Skeleton className="h-14 rounded-lg" />
                                        <Skeleton className="h-14 rounded-lg" />
                                    </div>
                                </GlassCard>
                            )}

                            {/* ---- Campaign Wizard (step by step) ---- */}
                            {campaignParams && !publishLoading && (
                                <GlassCard className="space-y-5 border-primary/30">

                                    {/* Step Indicator */}
                                    <div className="flex items-center">
                                        {(['Campanha', 'Orçamento', 'Conjuntos', 'Revisão'] as const).map((label, idx) => {
                                            const step = (idx + 1) as 1 | 2 | 3 | 4;
                                            const done = wizardStep > step;
                                            const active = wizardStep === step;
                                            return (
                                                <div key={step} className="flex items-center flex-1 last:flex-none">
                                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                                        <div className={cn(
                                                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                                                            active ? "bg-primary border-primary text-primary-foreground" :
                                                            done ? "bg-primary/20 border-primary text-primary" :
                                                            "bg-muted border-border text-muted-foreground"
                                                        )}>
                                                            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
                                                        </div>
                                                        <span className={cn("text-[9px] font-semibold whitespace-nowrap", active ? "text-primary" : "text-muted-foreground")}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                    {idx < 3 && (
                                                        <div className={cn("flex-1 h-px mx-1.5 mb-3.5", done ? "bg-primary" : "bg-border")} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Step 1: Campaign Basics */}
                                    {wizardStep === 1 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-foreground">Campanha</span>
                                                <Badge variant="warning" className="ml-auto text-[10px]">SERÁ CRIADA PAUSADA</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome da Campanha</label>
                                                <input
                                                    type="text"
                                                    value={campaignParams.name}
                                                    onChange={e => setCampaignParams(prev => prev ? { ...prev, name: e.target.value } : prev)}
                                                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Objetivo</label>
                                                <select
                                                    value={campaignParams.objective}
                                                    onChange={e => {
                                                        const newObjective = e.target.value;
                                                        const defaults = getDefaultAdSetFields(newObjective);
                                                        setCampaignParams(prev => prev ? {
                                                            ...prev,
                                                            objective: newObjective,
                                                            ad_sets: (prev.ad_sets || []).map(adSet => ({
                                                                ...adSet,
                                                                destination_type: defaults.destination_type,
                                                                optimization_goal: defaults.optimization_goal,
                                                            }))
                                                        } : prev);
                                                    }}
                                                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    ID da Página do Facebook
                                                    <span className="ml-1 text-yellow-500 normal-case font-normal">(obrigatório para Leads, Vendas e Engajamento)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={campaignParams.page_id || ''}
                                                    onChange={e => setCampaignParams(prev => prev ? { ...prev, page_id: e.target.value } : prev)}
                                                    placeholder="Ex: 123456789012345 — encontre em Configurações da Página > Sobre"
                                                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Budget & Bid Strategy */}
                                    {wizardStep === 2 && (
                                        <div className="space-y-4">
                                            <div className="text-sm font-bold text-foreground">Orçamento & Lance</div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estratégia de Orçamento</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {([
                                                        { value: 'ABO', label: 'ABO', desc: 'Orçamento por conjunto' },
                                                        { value: 'CBO', label: 'CBO', desc: 'Orçamento da campanha' },
                                                    ] as const).map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setCampaignParams(prev => prev ? { ...prev, budget_type: opt.value } : prev)}
                                                            className={cn(
                                                                "flex flex-col items-start px-3 py-2.5 rounded-md border text-left transition-colors",
                                                                campaignParams.budget_type === opt.value
                                                                    ? "bg-primary/10 border-primary text-foreground"
                                                                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                                                            )}
                                                        >
                                                            <span className="text-sm font-bold">{opt.label}</span>
                                                            <span className="text-[11px]">{opt.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    Orçamento Diário (R$)
                                                    <span className="ml-1 normal-case font-normal text-muted-foreground">
                                                        {campaignParams.budget_type === 'CBO' ? '— total da campanha' : '— dividido entre conjuntos'}
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min={10}
                                                    value={campaignParams.daily_budget}
                                                    onChange={e => setCampaignParams(prev => prev ? { ...prev, daily_budget: Number(e.target.value) } : prev)}
                                                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            {campaignParams.budget_type === 'CBO' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estratégia de Lance</label>
                                                    <div className="space-y-1.5">
                                                        {BID_STRATEGIES.map(opt => (
                                                            <button key={opt.value} type="button"
                                                                onClick={() => setCampaignParams(prev => prev ? { ...prev, bid_strategy: opt.value, bid_amount: undefined } : prev)}
                                                                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-colors",
                                                                    campaignParams.bid_strategy === opt.value ? "bg-primary/10 border-primary" : "bg-muted/30 border-border hover:border-primary/40"
                                                                )}>
                                                                <div className={cn("h-4 w-4 rounded-full border-2 shrink-0", campaignParams.bid_strategy === opt.value ? "border-primary bg-primary" : "border-muted-foreground")} />
                                                                <div>
                                                                    <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                                                                    <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {campaignParams.bid_strategy !== 'LOWEST_COST_WITHOUT_CAP' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                {campaignParams.bid_strategy === 'TARGET_COST' ? 'Meta de custo por resultado (R$)' : 'Limite de lance (R$)'}
                                                            </label>
                                                            <input type="number" min={0.01} step={0.01}
                                                                value={campaignParams.bid_amount || ''}
                                                                onChange={e => setCampaignParams(prev => prev ? { ...prev, bid_amount: Number(e.target.value) } : prev)}
                                                                placeholder="Ex: 5.00"
                                                                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 3: Ad Sets (one at a time) */}
                                    {wizardStep === 3 && campaignParams.ad_sets && campaignParams.ad_sets.length > 0 && (() => {
                                        const adSet = campaignParams.ad_sets![adSetStep];
                                        const convLocations = CONVERSION_LOCATIONS[campaignParams.objective] || [];
                                        const optGoals = OPTIMIZATION_GOALS[adSet.destination_type] || [];
                                        return (
                                            <div className="space-y-4">
                                                {/* Counter + dots */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-foreground">
                                                        Conjunto {adSetStep + 1} de {campaignParams.ad_sets!.length}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        {campaignParams.ad_sets!.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setAdSetStep(idx)}
                                                                className={cn("h-1.5 rounded-full transition-all", idx === adSetStep ? "w-5 bg-primary" : "w-1.5 bg-border")}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Ad Set Name */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome do Conjunto</label>
                                                    <input
                                                        type="text"
                                                        value={adSet.name}
                                                        onChange={e => updateAdSet(adSetStep, { name: e.target.value })}
                                                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                {/* Conversion Location */}
                                                {convLocations.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Local da Conversão</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {convLocations.map(loc => (
                                                                <button
                                                                    key={loc.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newOptGoal = DEFAULT_OPT_GOAL[loc.value] || 'LINK_CLICKS';
                                                                        updateAdSet(adSetStep, { destination_type: loc.value, optimization_goal: newOptGoal, page_id: undefined });
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                                                                        adSet.destination_type === loc.value
                                                                            ? "bg-primary text-primary-foreground border-primary"
                                                                            : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
                                                                    )}
                                                                >
                                                                    {loc.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {adSet.destination_type === 'ON_AD' && (
                                                            <div className="mt-2 space-y-1">
                                                                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">ID da Página do Facebook (obrigatório)</label>
                                                                <input
                                                                    type="text"
                                                                    value={adSet.page_id || ''}
                                                                    onChange={e => updateAdSet(adSetStep, { page_id: e.target.value })}
                                                                    placeholder="Ex: 123456789012345"
                                                                    className="w-full bg-muted/50 border border-yellow-500/40 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Performance Goal */}
                                                {optGoals.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Meta de Desempenho</label>
                                                        <select
                                                            value={adSet.optimization_goal}
                                                            onChange={e => updateAdSet(adSetStep, { optimization_goal: e.target.value })}
                                                            className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                        >
                                                            {optGoals.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {/* Advantage+ Audience Toggle */}
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-xs font-semibold text-foreground">Público Advantage+</div>
                                                        <div className="text-[11px] text-muted-foreground">Meta expande automaticamente seu público</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAdSet(adSetStep, { advantage_audience: adSet.advantage_audience ? 0 : 1 })}
                                                        className={cn(
                                                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                                                            adSet.advantage_audience ? "bg-primary" : "bg-muted-foreground/30"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                                            adSet.advantage_audience ? "translate-x-6" : "translate-x-1"
                                                        )} />
                                                    </button>
                                                </div>
                                                {/* Age Range (manual targeting only) */}
                                                {!adSet.advantage_audience && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Idade mín.</label>
                                                            <input
                                                                type="number" min={18} max={65}
                                                                value={adSet.age_min}
                                                                onChange={e => updateAdSet(adSetStep, { age_min: Number(e.target.value) })}
                                                                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Idade máx.</label>
                                                            <input
                                                                type="number" min={18} max={65}
                                                                value={adSet.age_max}
                                                                onChange={e => updateAdSet(adSetStep, { age_max: Number(e.target.value) })}
                                                                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* ABO: Bid Strategy per ad set */}
                                                {campaignParams.budget_type === 'ABO' && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estratégia de Lance</label>
                                                        <div className="space-y-1">
                                                            {BID_STRATEGIES.map(opt => (
                                                                <button key={opt.value} type="button"
                                                                    onClick={() => updateAdSet(adSetStep, { bid_strategy: opt.value, bid_amount: undefined })}
                                                                    className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors",
                                                                        adSet.bid_strategy === opt.value ? "bg-primary/10 border-primary" : "bg-muted/30 border-border hover:border-primary/40"
                                                                    )}>
                                                                    <div className={cn("h-3.5 w-3.5 rounded-full border-2 shrink-0", adSet.bid_strategy === opt.value ? "border-primary bg-primary" : "border-muted-foreground")} />
                                                                    <div>
                                                                        <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                                                                        <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {adSet.bid_strategy !== 'LOWEST_COST_WITHOUT_CAP' && (
                                                            <div className="space-y-1 mt-1">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                    {adSet.bid_strategy === 'TARGET_COST' ? 'Meta de custo por resultado (R$)' : 'Limite de lance (R$)'}
                                                                </label>
                                                                <input type="number" min={0.01} step={0.01}
                                                                    value={adSet.bid_amount || ''}
                                                                    onChange={e => updateAdSet(adSetStep, { bid_amount: Number(e.target.value) })}
                                                                    placeholder="Ex: 5.00"
                                                                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Interests */}
                                                {adSet.interests.length > 0 && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Interesses</label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {adSet.interests.map((interest, j) => (
                                                                <span key={j} className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">{interest}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Excluded Regions */}
                                                {adSet.excluded_regions.length > 0 && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regiões Excluídas</label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {adSet.excluded_regions.map((r, j) => (
                                                                <span key={j} className="text-[10px] bg-destructive/10 text-destructive rounded px-1.5 py-0.5">{r}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Anúncio Section */}
                                                <div className="border border-border rounded-md overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCreativeExpanded(v => !v);
                                                            setCreativePreviewUrl(null);
                                                            setCreativeError(null);
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                                            <span className="text-xs font-semibold text-foreground">Anúncio</span>
                                                            {adSet.creative_image_url && (
                                                                <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 rounded px-1.5 py-0.5 font-medium">Imagem definida</span>
                                                            )}
                                                            {adSet.ad_destination_url && (
                                                                <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5 font-medium">URL definida</span>
                                                            )}
                                                        </div>
                                                        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", creativeExpanded && "rotate-180")} />
                                                    </button>
                                                    {creativeExpanded && (
                                                        <div className="p-3 space-y-4 border-t border-border">
                                                            {/* Image Tabs */}
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Imagem do Anúncio</label>
                                                                <div className="flex gap-1 border border-border rounded-md p-0.5 bg-muted/20">
                                                                    {([
                                                                        { key: 'recent', label: 'Recentes' },
                                                                        { key: 'generate', label: 'Gerar' },
                                                                        { key: 'url', label: 'URL' },
                                                                    ] as const).map(tab => (
                                                                        <button
                                                                            key={tab.key}
                                                                            type="button"
                                                                            onClick={() => setCreativeTab(tab.key)}
                                                                            className={cn(
                                                                                "flex-1 py-1 rounded text-[10px] font-semibold transition-colors",
                                                                                creativeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                                                            )}
                                                                        >
                                                                            {tab.label}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Tab: Recent */}
                                                                {creativeTab === 'recent' && (
                                                                    <div>
                                                                        <div className="text-[11px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                                                                            Nenhum criativo gerado ainda.<br />
                                                                            <button type="button" onClick={() => setCreativeTab('url')} className="text-primary hover:underline">Usar URL</button>
                                                                        </div>
                                                                        {adSet.creative_image_url && (
                                                                            <div className="mt-2 flex items-center gap-2">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img src={adSet.creative_image_url} alt="selected" className="w-8 h-8 rounded object-cover border border-primary" />
                                                                                <span className="text-[10px] text-green-500 font-semibold flex-1">Imagem selecionada</span>
                                                                                <button type="button" onClick={() => updateAdSet(adSetStep, { creative_image_url: undefined })} className="text-[10px] text-destructive hover:underline">Remover</button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Tab: Generate */}
                                                                {creativeTab === 'generate' && (
                                                                    <div className="space-y-2.5">
                                                                        <div className="space-y-1">
                                                                            <textarea
                                                                                value={creativePrompt}
                                                                                onChange={e => setCreativePrompt(e.target.value)}
                                                                                placeholder='Descreva o criativo: "produto de beleza, fundo branco, estilo minimalista"'
                                                                                rows={2}
                                                                                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                            />
                                                                        </div>
                                                                        <div className="flex gap-1.5">
                                                                            {[{ v: "1:1", l: "1:1" }, { v: "9:16", l: "9:16" }, { v: "16:9", l: "16:9" }, { v: "4:5", l: "4:5" }].map(f => (
                                                                                <button
                                                                                    key={f.v}
                                                                                    type="button"
                                                                                    onClick={() => setCreativeFormat(f.v)}
                                                                                    className={cn(
                                                                                        "px-2.5 py-1 rounded text-[10px] font-bold border transition-colors",
                                                                                        creativeFormat === f.v ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                                                                                    )}
                                                                                >{f.l}</button>
                                                                            ))}
                                                                        </div>
                                                                        {creativeError && (
                                                                            <div className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1.5">{creativeError}</div>
                                                                        )}
                                                                        <Button
                                                                            onClick={handleGenerateCreative}
                                                                            disabled={creativeGenerating || !creativePrompt.trim()}
                                                                            className="w-full h-8 text-xs"
                                                                        >
                                                                            {creativeGenerating ? (
                                                                                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Gerando...</>
                                                                            ) : (
                                                                                <><ImageIcon className="mr-1.5 h-3 w-3" /> Gerar Criativo</>
                                                                            )}
                                                                        </Button>
                                                                        {creativePreviewUrl && (
                                                                            <div className="space-y-2">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img src={creativePreviewUrl} alt="preview" className="w-full rounded-md border border-border object-contain max-h-40" />
                                                                                <div className="flex gap-1.5">
                                                                                    <Button variant="outline" className="flex-1 h-7 text-[10px]" onClick={() => handleCopyCreativeUrl(creativePreviewUrl)}>
                                                                                        {creativeCopied ? <><CheckCheck className="mr-1 h-3 w-3 text-green-500" /> Copiado</> : <><Copy className="mr-1 h-3 w-3" /> Copiar URL</>}
                                                                                    </Button>
                                                                                    <Button
                                                                                        className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white"
                                                                                        onClick={() => {
                                                                                            updateAdSet(adSetStep, { creative_image_url: creativePreviewUrl });
                                                                                            setCreativeTab('recent');
                                                                                        }}
                                                                                    >
                                                                                        Usar esta imagem
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Tab: URL manual */}
                                                                {creativeTab === 'url' && (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            type="url"
                                                                            value={adSet.creative_image_url || ""}
                                                                            onChange={e => updateAdSet(adSetStep, { creative_image_url: e.target.value })}
                                                                            placeholder="https://... cole a URL da imagem"
                                                                            className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                        />
                                                                        {adSet.creative_image_url && (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={adSet.creative_image_url} alt="preview" className="w-full rounded-md border border-border object-contain max-h-32" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Ad Copy Fields */}
                                                            <div className="space-y-2.5 pt-1 border-t border-border">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cópia do Anúncio</label>

                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground">URL de Destino *</label>
                                                                    <input
                                                                        type="url"
                                                                        value={adSet.ad_destination_url || ""}
                                                                        onChange={e => updateAdSet(adSetStep, { ad_destination_url: e.target.value })}
                                                                        placeholder="https://seusite.com.br/pagina"
                                                                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground">Título do Link</label>
                                                                    <input
                                                                        type="text"
                                                                        value={adSet.ad_headline || ""}
                                                                        onChange={e => updateAdSet(adSetStep, { ad_headline: e.target.value })}
                                                                        placeholder="Ex: Oferta Imperdível — 50% OFF"
                                                                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground">Texto Principal</label>
                                                                    <textarea
                                                                        value={adSet.ad_body || ""}
                                                                        onChange={e => updateAdSet(adSetStep, { ad_body: e.target.value })}
                                                                        placeholder="Texto que aparece acima da imagem..."
                                                                        rows={2}
                                                                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground">Botão CTA</label>
                                                                        <select
                                                                            value={adSet.ad_cta_type || "LEARN_MORE"}
                                                                            onChange={e => updateAdSet(adSetStep, { ad_cta_type: e.target.value })}
                                                                            className="w-full bg-muted/50 border border-border rounded-md px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                                        >
                                                                            {CTA_TYPES.map(c => (
                                                                                <option key={c.value} value={c.value}>{c.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground">Nome do Anúncio</label>
                                                                        <input
                                                                            type="text"
                                                                            value={adSet.ad_name || ""}
                                                                            onChange={e => updateAdSet(adSetStep, { ad_name: e.target.value })}
                                                                            placeholder="(opcional)"
                                                                            className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Step 4: Review & Publish */}
                                    {wizardStep === 4 && (
                                        <div className="space-y-4">
                                            <div className="text-sm font-bold text-foreground">Revisão da Campanha</div>
                                            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2.5">
                                                {[
                                                    { label: 'Nome', value: campaignParams.name },
                                                    { label: 'Objetivo', value: OBJECTIVE_LABELS[campaignParams.objective] || campaignParams.objective },
                                                    { label: 'Orçamento diário', value: `R$ ${campaignParams.daily_budget}` },
                                                    { label: 'Tipo de orçamento', value: campaignParams.budget_type },
                                                    { label: 'Estratégia de lance', value: BID_STRATEGIES.find(b => b.value === campaignParams.bid_strategy)?.label || campaignParams.bid_strategy },
                                                    ...(campaignParams.page_id ? [{ label: 'ID da Página', value: campaignParams.page_id }] : []),
                                                ].map(row => (
                                                    <div key={row.label} className="flex items-center justify-between gap-4">
                                                        <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                                                        <span className="text-sm font-semibold text-foreground text-right">{row.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {campaignParams.ad_sets && campaignParams.ad_sets.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        Conjuntos ({campaignParams.ad_sets.length})
                                                    </label>
                                                    {campaignParams.ad_sets.map((adSet, i) => (
                                                        <div key={i} className="rounded-md border border-border bg-muted/10 px-3 py-2 flex items-center gap-2">
                                                            {adSet.creative_image_url && (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={adSet.creative_image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0 border border-border" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold text-foreground">{adSet.name}</div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {CONVERSION_LOCATIONS[campaignParams.objective]?.find(l => l.value === adSet.destination_type)?.label || adSet.destination_type}
                                                                    {adSet.advantage_audience ? ' · Advantage+' : ` · ${adSet.age_min}–${adSet.age_max} anos`}
                                                                </div>
                                                                {adSet.ad_headline && (
                                                                    <div className="text-[10px] font-semibold text-foreground truncate">{adSet.ad_headline}</div>
                                                                )}
                                                                {adSet.ad_destination_url && (
                                                                    <div className="text-[10px] text-primary truncate">{adSet.ad_destination_url}</div>
                                                                )}
                                                            </div>
                                                            <button type="button"
                                                                onClick={() => { setWizardStep(3); setAdSetStep(i); }}
                                                                className="text-[10px] text-primary hover:underline shrink-0">
                                                                Editar
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="text-xs text-yellow-500 font-medium">
                                                ⚠️ Campanha será criada como PAUSADA. Adicione criativos e ative no Meta Ads Manager.
                                            </div>
                                            {createError && (
                                                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="font-semibold">Erro ao criar campanha</div>
                                                        <div>{createError}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Navigation */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            onClick={() => { setCampaignParams(null); setPublishPrompt(""); setCreateError(null); }}
                                            disabled={creating}
                                        >
                                            Cancelar
                                        </Button>
                                        {wizardStep > 1 && (
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (wizardStep === 3 && adSetStep > 0) {
                                                        setAdSetStep(s => s - 1);
                                                    } else if (wizardStep === 4) {
                                                        setWizardStep(3);
                                                        setAdSetStep((campaignParams.ad_sets?.length || 1) - 1);
                                                    } else {
                                                        setWizardStep(s => (s - 1) as 1 | 2 | 3 | 4);
                                                    }
                                                }}
                                                disabled={creating}
                                            >
                                                ← Anterior
                                            </Button>
                                        )}
                                        <div className="flex-1" />
                                        {wizardStep < 4 ? (
                                            <Button
                                                onClick={() => {
                                                    if (wizardStep === 3) {
                                                        const lastIdx = (campaignParams.ad_sets?.length || 1) - 1;
                                                        if (adSetStep < lastIdx) { setAdSetStep(s => s + 1); }
                                                        else { setWizardStep(4); }
                                                    } else {
                                                        setWizardStep(s => (s + 1) as 1 | 2 | 3 | 4);
                                                    }
                                                }}
                                            >
                                                Próximo →
                                            </Button>
                                        ) : (
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={handleCreateCampaign}
                                                disabled={creating}
                                            >
                                                {creating ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
                                                ) : (
                                                    <><Rocket className="mr-2 h-4 w-4" /> Criar Campanha</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </GlassCard>
                            )}

                            {/* Success */}
                            {createdCampaignId && (
                                <div className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-4">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <div className="font-bold text-green-500">Campanha criada com sucesso!</div>
                                        <div className="text-sm text-muted-foreground">
                                            Campanha: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{createdCampaignId}</code>
                                        </div>
                                        {createdAdSetIds.length > 0 && (
                                            <div className="text-sm text-muted-foreground">
                                                <span>Conjuntos criados ({createdAdSetIds.length}):</span>
                                                <div className="mt-0.5 space-y-0.5">
                                                    {createdAdSetIds.map((id, i) => (
                                                        <div key={i}><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code></div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {createdAdIds.length > 0 && (
                                            <div className="text-sm text-muted-foreground">
                                                <span>Anúncios criados ({createdAdIds.length}):</span>
                                                <div className="mt-0.5 space-y-0.5">
                                                    {createdAdIds.map((id, i) => (
                                                        <div key={i}><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code></div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {adErrors.length > 0 && (
                                            <div className="text-sm text-yellow-500">
                                                <span className="font-semibold">Alguns anúncios falharam:</span>
                                                <ul className="mt-0.5 space-y-0.5 text-xs list-disc list-inside">
                                                    {adErrors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="text-xs text-muted-foreground pt-1">
                                            Tudo criado como <strong>PAUSADO</strong>. Acesse o Meta Ads Manager para ativar quando estiver pronto.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Ad Set Errors */}
                            {adSetErrors.length > 0 && createdCampaignId && (
                                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="font-semibold">Alguns conjuntos não foram criados:</div>
                                        <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
                                            {adSetErrors.map((err, i) => <li key={i}>{err}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ---- OPTIMIZATION TAB ---- */}
                {activeTab === "optimization" && (
                    <Card className="border-border bg-card">
                        <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                            <BarChart2 className="h-16 w-16 text-muted-foreground" />
                            <h3 className="text-xl font-bold">Sugestões de Otimização</h3>
                            <p className="text-muted-foreground max-w-md">Avalie o desempenho atual e aplique mudanças automáticas baseadas em regras e análise do Claude.</p>
                            <Button disabled>Buscar Relatório (Em breve)</Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
