"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const body = {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            workspaceName: formData.get("workspaceName") as string,
        };

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Erro ao criar conta.");
                setLoading(false);
                return;
            }

            router.push("/");
        } catch {
            setError("Erro ao conectar ao servidor. Tente novamente.");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/3 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm mx-auto px-6 py-10">
                <div className="flex flex-col items-center mb-10">
                    <Logo className="scale-150 mb-6" />
                    <h1 className="text-2xl font-black text-white tracking-tight">Criar conta</h1>
                    <p className="text-sm text-white/40 mt-1 font-medium">Configure seu workspace em minutos</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Nome</label>
                        <input
                            type="text"
                            name="name"
                            required
                            autoComplete="name"
                            placeholder="Seu nome"
                            className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">E-mail</label>
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
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Senha</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white font-medium placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Nome da empresa / workspace</label>
                        <input
                            type="text"
                            name="workspaceName"
                            required
                            placeholder="Ex: Minha Agência"
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
                        className="w-full h-12 rounded-xl bg-primary text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4" />
                                Criar conta
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-white/30 mt-8">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                        Fazer login
                    </Link>
                </p>
            </div>
        </div>
    );
}
