"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

const INPUT_CLASS = "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 transition-colors";

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
            <div className="space-y-1.5">
                <label htmlFor="invite-email" className="text-sm font-medium text-foreground">E-mail</label>
                <input
                    id="invite-email"
                    type="email"
                    value={email}
                    disabled
                    className="h-11 w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3.5 text-sm text-muted-foreground"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="invite-name" className="text-sm font-medium text-foreground">Seu nome</label>
                <input
                    id="invite-name"
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Como quer ser chamado?"
                    className={INPUT_CLASS}
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="invite-password" className="text-sm font-medium text-foreground">Senha</label>
                <input
                    id="invite-password"
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className={INPUT_CLASS}
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
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
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
