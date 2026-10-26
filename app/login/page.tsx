"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth-actions";
import { ArrowRight, BarChart3, Bot, Loader2, Zap } from "lucide-react";
import { BrandMark } from "@/components/ui/Logo";
import { ClaudeIcon, GoogleAdsIcon, MetaIcon } from "@/components/ui/PlatformIcons";
import { APP_NAME } from "@/lib/brand";

const HIGHLIGHTS = [
    { icon: BarChart3, title: "Meta Ads e Google Ads num só lugar", text: "Investimento, leads e conversões consolidados por cliente." },
    { icon: Zap, title: "Relatórios automáticos", text: "Envio diário no WhatsApp e alertas de saldo e fim de campanha." },
    { icon: Bot, title: "Conectado ao Claude", text: "Pergunte sobre suas campanhas direto no Claude via MCP." },
];

function LoginForm() {
    const searchParams = useSearchParams();
    const next = searchParams.get("next") ?? "";
    const authorizingApp = next.startsWith("/oauth/authorize");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await loginAction(formData);
            if (result?.error) {
                setError(result.error);
                setLoading(false);
            }
        } catch (err: any) {
            // NEXT_REDIRECT é um erro proposital do Next.js para fazer o roteamento
            if (err.message === 'NEXT_REDIRECT' || (err.digest && err.digest.includes('NEXT_REDIRECT'))) {
                throw err;
            }
            console.error("Login exception:", err);
            setError("Erro ao conectar ao servidor. Tente novamente.");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="next" value={next} />

            {authorizingApp && (
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground">
                    <ClaudeIcon className="h-4 w-4 shrink-0" />
                    Entre para autorizar o acesso do Claude à sua conta.
                </div>
            )}

            <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
                <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 transition-colors"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
                <input
                    id="password"
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 transition-colors"
                />
            </div>

            {error && (
                <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        Entrar
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                )}
            </button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
            {/* Brand panel */}
            <aside className="relative hidden overflow-hidden border-r border-border bg-[#0b0c0f] p-12 text-white lg:flex lg:flex-col">
                <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#bcec41]/20 blur-3xl" />
                <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-[#bcec41]/10 blur-3xl" />

                <div className="relative flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <svg viewBox="0 0 1322.88 1131.26" className="h-5 w-5" aria-hidden="true">
                            <path fill="#fff" d="M1029.02,700.66l-209.48,362.83c-17.39,30.12,4.35,67.77,39.13,67.77h418.96c34.78,0,56.52-37.65,39.13-67.77l-209.48-362.83c-17.39-30.12-60.87-30.12-78.26,0Z" />
                            <path fill="#bcec41" d="M980.1,580.11l-294.56,510.22c-14.61,25.31-41.62,40.91-70.85,40.91h-71.94c-13.87,0-22.53-15.01-15.6-27.02l209.16-362.31c15.29-26.48,6.21-60.34-20.27-75.62h0c-26.48-15.28-60.33-6.21-75.62,20.26l-251.55,435.68c-3.22,5.57-9.16,9.01-15.6,9.01h-78.4c-13.87,0-22.53-15.01-15.6-27.02l271.14-469.59c15.29-26.48,6.21-60.34-20.26-75.62h0c-26.48-15.28-60.33-6.21-75.61,20.26l-313.45,542.96c-3.22,5.57-9.16,9.01-15.6,9.01H18.04c-13.87,0-22.53-15.01-15.6-27.02L624.37,27.16c20.92-36.22,73.2-36.22,94.11,0l261.63,453.12c17.83,30.89,17.83,68.94,0,99.83Z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
                </div>

                <div className="relative mt-auto max-w-md">
                    <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white">
                        Toda a sua gestão de tráfego, <span className="text-[#bcec41]">num painel só.</span>
                    </h2>
                    <ul className="mt-10 space-y-6">
                        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                    <Icon className="h-[18px] w-[18px] text-[#bcec41]" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-sm text-white/55">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-12 flex items-center gap-3 text-xs text-white/40">
                        <span>Integra com</span>
                        <MetaIcon className="h-4 w-4" />
                        <GoogleAdsIcon className="h-4 w-4" />
                        <ClaudeIcon className="h-4 w-4" />
                    </div>
                </div>
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                            <BrandMark className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight">Entrar na sua conta</h1>
                    <p className="mt-1.5 mb-8 text-sm text-muted-foreground">Use o e-mail e a senha cadastrados pelo seu administrador.</p>

                    <Suspense>
                        <LoginForm />
                    </Suspense>

                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        Não tem acesso? Peça um convite ao administrador do workspace.
                    </p>
                </div>
            </main>
        </div>
    );
}
