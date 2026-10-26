"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIsClient } from "@/hooks/use-is-client";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useUser } from "@/components/providers/UserContext";
import { updateProfileNameAction, changePasswordAction } from "@/actions/profile-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-5">{children}</div>
        </section>
    );
}

function Feedback({ result }: { result: { ok: boolean; message: string } | null }) {
    if (!result) return null;
    return <p className={cn("text-sm", result.ok ? "text-success" : "text-destructive")}>{result.message}</p>;
}

export function ProfilePanel() {
    const user = useUser();
    const router = useRouter();
    const [name, setName] = useState(user?.name ?? "");
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await updateProfileNameAction(name);
        setSaving(false);
        setResult(res.success ? { ok: true, message: "Nome atualizado." } : { ok: false, message: res.error ?? "Erro ao salvar" });
        if (res.success) router.refresh();
    };

    return (
        <Panel title="Perfil" description={user?.workspace_name ? `Workspace ${user.workspace_name} · ${user.role}` : undefined}>
            <form onSubmit={save} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="text-sm font-medium">Nome</label>
                    <Input id="profile-name" value={name} onChange={e => { setName(e.target.value); setResult(null); }} />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="profile-email" className="text-sm font-medium">E-mail</label>
                    <Input id="profile-email" value={user?.email ?? ""} disabled />
                    <p className="text-xs text-muted-foreground">O e-mail de login só pode ser alterado pelo administrador.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button type="submit" isLoading={saving} disabled={!name.trim() || name.trim() === (user?.name ?? "")}>Salvar</Button>
                    <Feedback result={result} />
                </div>
            </form>
        </Panel>
    );
}

export function PasswordPanel() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

    const mismatch = confirm.length > 0 && next !== confirm;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mismatch) return;
        setSaving(true);
        const res = await changePasswordAction(current, next);
        setSaving(false);
        if (res.success) {
            setCurrent(""); setNext(""); setConfirm("");
            setResult({ ok: true, message: "Senha alterada." });
        } else {
            setResult({ ok: false, message: res.error ?? "Erro ao alterar a senha" });
        }
    };

    return (
        <Panel title="Senha">
            <form onSubmit={save} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="pw-current" className="text-sm font-medium">Senha atual</label>
                    <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="pw-new" className="text-sm font-medium">Nova senha</label>
                        <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="pw-confirm" className="text-sm font-medium">Confirmar</label>
                        <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                    </div>
                </div>
                {mismatch && <p className="text-sm text-destructive">As senhas não coincidem.</p>}
                <div className="flex items-center gap-3">
                    <Button type="submit" variant="outline" isLoading={saving} disabled={!current || next.length < 8 || mismatch}>Alterar senha</Button>
                    <Feedback result={result} />
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            </form>
        </Panel>
    );
}

export function AppearancePanel() {
    const { theme, setTheme } = useTheme();
    const mounted = useIsClient();

    const options = [
        { value: "light", label: "Claro", icon: Sun },
        { value: "dark", label: "Escuro", icon: Moon },
        { value: "system", label: "Sistema", icon: Monitor },
    ];

    return (
        <Panel title="Aparência" description="Escolha o tema da interface neste navegador.">
            <div className="grid grid-cols-3 gap-2">
                {options.map(({ value, label, icon: Icon }) => {
                    const active = mounted && theme === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setTheme(value)}
                            aria-pressed={active}
                            className={cn(
                                "relative flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                                active ? "border-ring bg-accent text-foreground" : "border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            {active && <Check className="absolute right-2 top-2 h-3 w-3 text-brand-ink" />}
                        </button>
                    );
                })}
            </div>
        </Panel>
    );
}
