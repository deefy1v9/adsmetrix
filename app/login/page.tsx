"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth-actions";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
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
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/3 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                        <span className="text-xl font-black text-primary">A</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        Ads Manager
                    </h1>
                    <p className="text-sm text-white/40 mt-1 font-medium">
                        Faça login para continuar
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                            E-mail
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            placeholder="seu@email.com"
                            className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                            Senha
                        </label>
                        <input
                            type="password"
                            name="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <LogIn className="h-4 w-4" />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-[10px] text-white/20 mt-10 font-medium uppercase tracking-widest">
                    Ads Manager
                </p>
            </div>
        </div>
    );
}
