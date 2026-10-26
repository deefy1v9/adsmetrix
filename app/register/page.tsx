"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/ui/Logo";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

const INPUT_CLASS = "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 transition-colors";

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
        <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                        <BrandMark className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
                <p className="mt-1.5 mb-8 text-sm text-muted-foreground">Configure seu workspace em minutos.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            required
                            autoComplete="name"
                            placeholder="Seu nome"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            placeholder="seu@email.com"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="workspaceName" className="text-sm font-medium text-foreground">Nome da empresa / workspace</label>
                        <input
                            id="workspaceName"
                            type="text"
                            name="workspaceName"
                            required
                            placeholder="Ex: Minha Agência"
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
                                Criar conta
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                        Fazer login
                    </Link>
                </p>
            </div>
        </main>
    );
}
