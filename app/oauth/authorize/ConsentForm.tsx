"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check, ExternalLink, Loader2 } from "lucide-react";
import { decideAuthorizationAction } from "@/actions/oauth-actions";
import { MCP_SCOPES } from "@/lib/mcp/scopes";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { AuthorizeParams } from "@/lib/mcp/authorize";

function DecisionButtons() {
    const { pending, data } = useFormStatus();
    const choice = data?.get("decision");
    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                type="submit"
                name="decision"
                value="deny"
                disabled={pending}
                className="h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
                {pending && choice === "deny" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Cancelar"}
            </button>
            <button
                type="submit"
                name="decision"
                value="approve"
                disabled={pending}
                className="h-10 rounded-lg bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
                {pending && choice === "approve" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Autorizar"}
            </button>
        </div>
    );
}

export function ConsentForm({ params, clientName, redirectHost, isLoopback, scopes, userEmail, workspaceName }: {
    params: AuthorizeParams;
    clientName: string;
    redirectHost: string;
    isLoopback: boolean;
    scopes: string[];
    userEmail: string;
    workspaceName: string;
}) {
    const [allowWrite, setAllowWrite] = useState(false);
    const readScopes = scopes.filter(s => s !== "ads:write");
    const wantsWrite = scopes.includes("ads:write");

    return (
        <form action={decideAuthorizationAction} className="glass-card rounded-2xl p-6 sm:p-8">
            {Object.entries(params).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

            <h1 className="text-center text-xl font-bold tracking-tight">
                {clientName} quer acessar o {APP_NAME}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
                Workspace <span className="font-medium text-foreground">{workspaceName}</span> · conectado como{" "}
                <span className="font-medium text-foreground">{userEmail}</span>
            </p>

            <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Este acesso permite</p>
                <ul className="space-y-2">
                    {readScopes.map(s => (
                        <li key={s} className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                <Check className="h-3 w-3" />
                            </span>
                            <span>
                                <span className="block text-sm font-medium">{MCP_SCOPES[s]?.label ?? s}</span>
                                <span className="block text-xs text-muted-foreground">{MCP_SCOPES[s]?.description}</span>
                            </span>
                        </li>
                    ))}
                    {wantsWrite && (
                        <li>
                            <label className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                allowWrite ? "border-warning/40 bg-warning/10" : "border-border bg-surface hover:bg-accent/50",
                            )}>
                                <input
                                    type="checkbox"
                                    name="allow_write"
                                    checked={allowWrite}
                                    onChange={e => setAllowWrite(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand-ink))]"
                                />
                                <span>
                                    <span className="block text-sm font-medium">{MCP_SCOPES["ads:write"].label} <span className="text-xs font-normal text-muted-foreground">(opcional)</span></span>
                                    <span className="block text-xs text-muted-foreground">{MCP_SCOPES["ads:write"].description}</span>
                                </span>
                            </label>
                        </li>
                    )}
                </ul>
            </div>

            {isLoopback ? (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        O retorno vai para <strong>{redirectHost}</strong>, um endereço local deste computador. Autorize apenas se você
                        iniciou a conexão agora (por exemplo, pelo Claude Code).
                    </span>
                </div>
            ) : (
                <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" /> Você será redirecionado para <strong className="text-foreground">{redirectHost}</strong>
                </p>
            )}

            <div className="mt-5">
                <DecisionButtons />
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                Você pode revogar este acesso a qualquer momento em Integrações → Claude (MCP).
            </p>
        </form>
    );
}
