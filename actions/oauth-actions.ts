"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requestFromHeaders } from "@/lib/base-url";
import { createAuthorizationCode, getIssuer, getMcpResourceUrl, revokeGrant, DEFAULT_SCOPES } from "@/lib/mcp/oauth";
import { buildRedirect, pickAuthorizeParams, validateAuthorizeRequest } from "@/lib/mcp/authorize";

/** Consent screen submit: approve → redirect with a code; deny → redirect with access_denied. */
export async function decideAuthorizationAction(formData: FormData) {
    const request = await requestFromHeaders();
    const params = pickAuthorizeParams(formData);
    const validation = await validateAuthorizeRequest(params, request);
    if (!validation.ok) {
        if ("redirectTo" in validation) redirect(validation.redirectTo);
        throw new Error(validation.fatal);
    }

    const session = await getSession();
    if (!session) redirect("/login");
    if (!session.workspace_id) throw new Error("Seu usuário não está vinculado a um workspace.");

    const iss = getIssuer(request);
    if (formData.get("decision") !== "approve") {
        redirect(buildRedirect(validation.redirectUri, { error: "access_denied", error_description: "O usuário recusou o acesso.", state: params.state, iss }));
    }

    // Write access is opt-in on the consent screen even when the client asked for it
    let scopes = validation.scopes.filter(s => s !== "ads:write" || formData.get("allow_write") === "on");
    if (scopes.length === 0) scopes = [...DEFAULT_SCOPES];

    const code = await createAuthorizationCode({
        clientId: validation.client.client_id,
        userId: session.id,
        workspaceId: session.workspace_id,
        redirectUri: validation.redirectUri,
        codeChallenge: params.code_challenge!,
        scope: scopes.join(" "),
        resource: params.resource ?? getMcpResourceUrl(request),
    });

    redirect(buildRedirect(validation.redirectUri, { code, state: params.state, iss }));
}

export interface McpConnectionView {
    id: string;
    client_name: string;
    scopes: string[];
    created_at: string;
    last_used_at: string | null;
    user_email: string;
    is_mine: boolean;
}

/** Active Claude connections of the workspace, for the Integrations page. */
export async function listMcpConnectionsAction(): Promise<{ connections: McpConnectionView[]; mcpUrl: string }> {
    const request = await requestFromHeaders();
    const mcpUrl = getMcpResourceUrl(request);
    const session = await getSession();
    if (!session?.workspace_id) return { connections: [], mcpUrl };

    const grants = await prisma.oAuthGrant.findMany({
        where: {
            workspace_id: session.workspace_id,
            revoked_at: null,
            tokens: { some: { type: "refresh", revoked_at: null, expires_at: { gt: new Date() } } },
        },
        include: { client: { select: { client_name: true } }, user: { select: { email: true } } },
        orderBy: { created_at: "desc" },
    });

    return {
        mcpUrl,
        connections: grants.map(g => ({
            id: g.id,
            client_name: g.client.client_name || "Cliente MCP",
            scopes: g.scope.split(" "),
            created_at: g.created_at.toISOString(),
            last_used_at: g.last_used_at?.toISOString() ?? null,
            user_email: g.user.email,
            is_mine: g.user_id === session.id,
        })),
    };
}

export async function revokeMcpConnectionAction(grantId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session?.workspace_id) return { success: false, error: "Sessão inválida." };
    const grant = await prisma.oAuthGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.workspace_id !== session.workspace_id) return { success: false, error: "Conexão não encontrada." };
    // Members revoke their own connections; admins can revoke anyone's in the workspace
    if (grant.user_id !== session.id && session.role !== "Admin" && !session.is_super_admin) {
        return { success: false, error: "Apenas administradores podem revogar conexões de outros usuários." };
    }
    await revokeGrant(grantId);
    revalidatePath("/settings");
    return { success: true };
}
