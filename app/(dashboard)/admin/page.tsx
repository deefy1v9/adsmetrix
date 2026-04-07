"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/providers/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    listAllUsersAction,
    deleteUserAction,
    updateUserPermissionsAction,
    listAllDbAccountsAction,
} from "@/actions/admin-actions";
import {
    Loader2, Trash2, ChevronDown, ChevronUp, Shield, Users, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "deefy07@gmail.com";

const ALL_TABS = [
    { label: "Visão Geral",       href: "/overview" },
    { label: "Gestor de Tráfego", href: "/gestor-trafego" },
    { label: "Dashboard",         href: "/" },
    { label: "Leads",             href: "/leads" },
    { label: "Performance",       href: "/performance" },
    { label: "Automações",        href: "/automations" },
    { label: "WhatsApp",          href: "/whatsapp-reports" },
    { label: "Logs",              href: "/logs" },
    { label: "Notificações",      href: "/notifications" },
    { label: "Configurações",     href: "/settings" },
];

type AdminUser = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    workspace_name: string | null;
    is_super_admin: boolean;
    allowed_tabs: string[] | null;
    allowed_account_ids: string[] | null;
    created_at: string;
};

type DbAccount = {
    id: string;
    account_id: string;
    name: string;
    workspace_name: string | null;
};

function UserRow({ user, accounts, onDeleted }: {
    user: AdminUser;
    accounts: DbAccount[];
    onDeleted: () => void;
}) {
    const [expanded, setExpanded]       = useState(false);
    const [saving, setSaving]           = useState(false);
    const [deleting, setDeleting]       = useState(false);
    const [tabs, setTabs]               = useState<string[] | null>(user.allowed_tabs);
    const [accs, setAccs]               = useState<string[] | null>(user.allowed_account_ids);

    const allTabsAllowed  = tabs === null;
    const allAccsAllowed  = accs === null;

    function toggleTab(href: string) {
        const current = tabs ?? ALL_TABS.map(t => t.href);
        setTabs(
            current.includes(href) ? current.filter(h => h !== href) : [...current, href]
        );
    }

    function toggleAccount(accountId: string) {
        const current = accs ?? accounts.map(a => a.account_id);
        setAccs(
            current.includes(accountId) ? current.filter(id => id !== accountId) : [...current, accountId]
        );
    }

    async function handleSave() {
        setSaving(true);
        await updateUserPermissionsAction(user.id, tabs, accs);
        setSaving(false);
    }

    async function handleDelete() {
        if (!confirm(`Excluir usuário ${user.email}? Esta ação é irreversível.`)) return;
        setDeleting(true);
        const res = await deleteUserAction(user.id);
        if (res.success) onDeleted();
        else { alert("Erro ao excluir"); setDeleting(false); }
    }

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-card">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{user.name || user.email}</span>
                        {user.is_super_admin && (
                            <Badge variant="warning" className="text-[9px]">SUPER ADMIN</Badge>
                        )}
                        {user.allowed_tabs !== null && (
                            <Badge variant="neutral" className="text-[9px]">{(user.allowed_tabs ?? []).length} abas</Badge>
                        )}
                        {user.allowed_account_ids !== null && (
                            <Badge variant="neutral" className="text-[9px]">{(user.allowed_account_ids ?? []).length} contas</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {user.email} · {user.workspace_name ?? "Sem workspace"}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Excluir usuário"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded permissions */}
            {expanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-4 space-y-5">
                    {/* Tabs */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Abas permitidas</p>
                            <button
                                onClick={() => setTabs(null)}
                                className={cn("text-[10px] font-bold transition-colors", allTabsAllowed ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                            >
                                {allTabsAllowed ? "✓ Todas" : "Liberar todas"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {ALL_TABS.map(tab => {
                                const allowed = allTabsAllowed || (tabs ?? []).includes(tab.href);
                                return (
                                    <button
                                        key={tab.href}
                                        onClick={() => toggleTab(tab.href)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                            allowed
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                                        )}
                                    >
                                        {allowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Accounts */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contas de anúncio</p>
                            <button
                                onClick={() => setAccs(null)}
                                className={cn("text-[10px] font-bold transition-colors", allAccsAllowed ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                            >
                                {allAccsAllowed ? "✓ Todas" : "Liberar todas"}
                            </button>
                        </div>
                        {accounts.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhuma conta no banco de dados.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                {accounts.map(acc => {
                                    const allowed = allAccsAllowed || (accs ?? []).includes(acc.account_id);
                                    return (
                                        <button
                                            key={acc.account_id}
                                            onClick={() => toggleAccount(acc.account_id)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs border transition-all",
                                                allowed
                                                    ? "bg-primary/10 border-primary/40 text-foreground"
                                                    : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                                            )}
                                        >
                                            <div className={cn("w-2 h-2 rounded-full shrink-0", allowed ? "bg-emerald-400" : "bg-muted-foreground/30")} />
                                            <span className="truncate font-medium">{acc.name}</span>
                                            {acc.workspace_name && (
                                                <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">{acc.workspace_name}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Button onClick={handleSave} disabled={saving} variant="primary" className="w-full sm:w-auto">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando…</> : "Salvar Permissões"}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    const user    = useUser();
    const router  = useRouter();
    const [users, setUsers]       = useState<AdminUser[]>([]);
    const [accounts, setAccounts] = useState<DbAccount[]>([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (user && user.email !== ADMIN_EMAIL) {
            router.replace("/");
            return;
        }
        Promise.all([listAllUsersAction(), listAllDbAccountsAction()])
            .then(([u, a]) => { setUsers(u); setAccounts(a); })
            .finally(() => setLoading(false));
    }, [user, router]);

    if (!user || user.email !== ADMIN_EMAIL) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Painel Admin</h2>
                    <p className="text-sm text-muted-foreground">Gerenciamento de usuários e permissões.</p>
                </div>
            </div>

            <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                        Usuários ({users.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
                ) : (
                    <div className="space-y-3">
                        {users
                            .filter(u => u.email !== ADMIN_EMAIL)
                            .map(u => (
                                <UserRow
                                    key={u.id}
                                    user={u}
                                    accounts={accounts}
                                    onDeleted={() => setUsers(prev => prev.filter(x => x.id !== u.id))}
                                />
                            ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
