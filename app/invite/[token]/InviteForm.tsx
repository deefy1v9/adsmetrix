"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

export default function InviteForm({ token, email }: { token: string; email: string }) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`/api/invites/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name") as string,
                    password: formData.get("password") as string,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Erro ao aceitar convite.");
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">E-mail</label>
                <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/50 font-medium opacity-60 cursor-not-allowed"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Seu nome</label>
                <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Como quer ser chamado?"
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
                        Entrar no workspace
                    </>
                )}
            </button>
        </form>
    );
}
