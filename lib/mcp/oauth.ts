import { createHash } from "crypto";
import type { OAuthClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { randomToken, safeEqual, sha256 } from "@/lib/crypto";
import { APP_NAME } from "@/lib/brand";

/**
 * OAuth 2.1 authorization server protecting the MCP endpoint, following the MCP
 * authorization spec (2025-11-25) and Claude's connector requirements:
 *   - Protected Resource Metadata (RFC 9728) → points Claude to this server
 *   - Authorization Server Metadata (RFC 8414)
 *   - Dynamic Client Registration (RFC 7591); CIMD optional via MCP_CIMD_ALLOWED_HOSTS
 *   - Authorization code + PKCE S256 only, refresh tokens rotated on every use
 * Tokens are opaque; only their SHA-256 is stored.
 */

import { MCP_SCOPES, SUPPORTED_SCOPES, DEFAULT_SCOPES } from "./scopes";
export { MCP_SCOPES, SUPPORTED_SCOPES, DEFAULT_SCOPES };

const ACCESS_TOKEN_TTL_S = 60 * 60;            // 1 hour
const REFRESH_TOKEN_TTL_S = 60 * 60 * 24 * 30; // 30 days, renewed on every refresh
const CODE_TTL_S = 5 * 60;

export const MCP_PATH = "/api/mcp";

export function getIssuer(request?: Request): string {
    return getBaseUrl(request);
}

/** The canonical MCP server URL — what users paste into Claude and the token audience. */
export function getMcpResourceUrl(request?: Request): string {
    return `${getBaseUrl(request)}${MCP_PATH}`;
}

export function getResourceMetadataUrl(request?: Request): string {
    return `${getBaseUrl(request)}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

function cimdAllowedHosts(): string[] {
    return (process.env.MCP_CIMD_ALLOWED_HOSTS ?? "")
        .split(",").map(h => h.trim().toLowerCase()).filter(Boolean);
}

export function protectedResourceMetadata(request: Request) {
    return {
        resource: getMcpResourceUrl(request),
        authorization_servers: [getIssuer(request)],
        scopes_supported: SUPPORTED_SCOPES,
        bearer_methods_supported: ["header"],
        resource_name: APP_NAME,
    };
}

export function authorizationServerMetadata(request: Request) {
    const issuer = getIssuer(request);
    return {
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/api/oauth/token`,
        registration_endpoint: `${issuer}/api/oauth/register`,
        revocation_endpoint: `${issuer}/api/oauth/revoke`,
        // offline_access listed so Claude asks for (and keeps) a refresh token
        scopes_supported: [...SUPPORTED_SCOPES, "offline_access"],
        response_types_supported: ["code"],
        response_modes_supported: ["query"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
        revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
        code_challenge_methods_supported: ["S256"],
        authorization_response_iss_parameter_supported: true,
        client_id_metadata_document_supported: cimdAllowedHosts().length > 0,
    };
}

/* ------------------------------------------------------------------ *
 *  Errors / responses                                                 *
 * ------------------------------------------------------------------ */

export const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
    "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
    "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS_HEADERS, ...extraHeaders },
    });
}

export function oauthError(error: string, description: string, status = 400, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse({ error, error_description: description }, status, extraHeaders);
}

export function corsPreflight(): Response {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ------------------------------------------------------------------ *
 *  Redirect URIs                                                      *
 * ------------------------------------------------------------------ */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopback(url: URL): boolean {
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/** https anywhere, or http on loopback (native clients such as Claude Code). */
export function validateRedirectUri(uri: string): string | null {
    let url: URL;
    try { url = new URL(uri); } catch { return `redirect_uri inválido: ${uri}`; }
    if (url.hash) return "redirect_uri não pode conter fragmento (#).";
    if (url.protocol === "https:" || isLoopback(url)) return null;
    return `redirect_uri deve usar https (ou http em localhost): ${uri}`;
}

/** Exact match, except loopback URIs where the port is ignored (RFC 8252 §7.3). */
export function redirectUriMatches(registered: string[], candidate: string): boolean {
    if (registered.includes(candidate)) return true;
    let c: URL;
    try { c = new URL(candidate); } catch { return false; }
    if (!isLoopback(c)) return false;
    return registered.some(r => {
        try {
            const u = new URL(r);
            return isLoopback(u) && u.hostname === c.hostname && u.pathname === c.pathname && u.search === c.search;
        } catch { return false; }
    });
}

/* ------------------------------------------------------------------ *
 *  Clients: DCR + CIMD                                                *
 * ------------------------------------------------------------------ */

export function clientRedirectUris(client: OAuthClient): string[] {
    return Array.isArray(client.redirect_uris) ? (client.redirect_uris as string[]) : [];
}

// Basic abuse guard for the open registration endpoint
const registrations = new Map<string, number[]>();
export function registrationRateLimited(ip: string): boolean {
    const now = Date.now();
    const recent = (registrations.get(ip) ?? []).filter(t => now - t < 60 * 60 * 1000);
    recent.push(now);
    registrations.set(ip, recent);
    return recent.length > 30;
}

const str = (v: unknown, max = 500) => typeof v === "string" && v.length <= max ? v : undefined;

export async function registerClient(body: any): Promise<{ status: number; body: Record<string, unknown> }> {
    const fail = (error: string, description: string) => ({ status: 400, body: { error, error_description: description } });

    if (!body || typeof body !== "object") return fail("invalid_client_metadata", "Corpo JSON obrigatório.");
    const redirectUris = body.redirect_uris;
    if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
        return fail("invalid_redirect_uri", "Informe de 1 a 10 redirect_uris.");
    }
    for (const uri of redirectUris) {
        const problem = typeof uri === "string" ? validateRedirectUri(uri) : "redirect_uri deve ser texto.";
        if (problem) return fail("invalid_redirect_uri", problem);
    }

    const authMethod = body.token_endpoint_auth_method ?? "none";
    if (!["none", "client_secret_post", "client_secret_basic"].includes(authMethod)) {
        return fail("invalid_client_metadata", `token_endpoint_auth_method não suportado: ${authMethod}`);
    }
    const grantTypes: string[] = Array.isArray(body.grant_types) ? body.grant_types : ["authorization_code", "refresh_token"];
    if (!grantTypes.includes("authorization_code")) {
        return fail("invalid_client_metadata", "grant_types deve incluir authorization_code.");
    }

    const clientId = randomToken("mcp_", 18);
    const clientSecret = authMethod === "none" ? null : randomToken("mcs_", 32);

    await prisma.oAuthClient.create({
        data: {
            client_id: clientId,
            client_secret_hash: clientSecret ? sha256(clientSecret) : null,
            client_name: str(body.client_name, 200) ?? null,
            client_uri: str(body.client_uri) ?? null,
            logo_uri: str(body.logo_uri) ?? null,
            redirect_uris: redirectUris,
            token_endpoint_auth_method: authMethod,
        },
    });

    return {
        status: 201,
        body: {
            client_id: clientId,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
            client_name: str(body.client_name, 200),
            redirect_uris: redirectUris,
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: authMethod,
        },
    };
}

async function fetchClientMetadataDocument(clientId: string): Promise<OAuthClient | null> {
    let url: URL;
    try { url = new URL(clientId); } catch { return null; }
    if (url.protocol !== "https:" || !url.pathname || url.pathname === "/") return null;
    if (!cimdAllowedHosts().includes(url.hostname.toLowerCase())) return null;

    const cached = await prisma.oAuthClient.findUnique({ where: { client_id: clientId } });
    if (cached && Date.now() - cached.updated_at.getTime() < 24 * 60 * 60 * 1000) return cached;

    try {
        const res = await fetch(clientId, { headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(5000) });
        if (!res.ok) return cached;
        const text = await res.text();
        if (text.length > 20_000) return cached;
        const doc = JSON.parse(text);
        if (doc.client_id !== clientId || !Array.isArray(doc.redirect_uris)) return cached;
        const uris = doc.redirect_uris.filter((u: unknown) => typeof u === "string" && !validateRedirectUri(u));
        if (uris.length === 0) return cached;

        const data = {
            client_name: str(doc.client_name, 200) ?? null,
            client_uri: str(doc.client_uri) ?? null,
            logo_uri: str(doc.logo_uri) ?? null,
            redirect_uris: uris,
            token_endpoint_auth_method: "none",
            is_metadata_document: true,
        };
        return prisma.oAuthClient.upsert({
            where: { client_id: clientId },
            update: data,
            create: { client_id: clientId, ...data },
        });
    } catch {
        return cached;
    }
}

export async function resolveClient(clientId: string | null | undefined): Promise<OAuthClient | null> {
    if (!clientId || clientId.length > 500) return null;
    if (clientId.startsWith("https://")) return fetchClientMetadataDocument(clientId);
    return prisma.oAuthClient.findUnique({ where: { client_id: clientId } });
}

/** Authenticates confidential clients at the token/revocation endpoints. Public clients pass. */
export function authenticateClient(client: OAuthClient, request: Request, form: URLSearchParams): boolean {
    if (client.token_endpoint_auth_method === "none" || !client.client_secret_hash) return true;

    let secret = form.get("client_secret");
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Basic ")) {
        try {
            const [id, pass] = Buffer.from(auth.slice(6), "base64").toString("utf8").split(":");
            if (decodeURIComponent(id) === client.client_id) secret = decodeURIComponent(pass ?? "");
        } catch { /* fall through */ }
    }
    return !!secret && safeEqual(sha256(secret), client.client_secret_hash);
}

/** client_id may come in the form body or in HTTP Basic auth. */
export function readClientId(request: Request, form: URLSearchParams): string | null {
    const fromForm = form.get("client_id");
    if (fromForm) return fromForm;
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Basic ")) {
        try { return decodeURIComponent(Buffer.from(auth.slice(6), "base64").toString("utf8").split(":")[0]); } catch { /* ignore */ }
    }
    return null;
}

/* ------------------------------------------------------------------ *
 *  Scopes / resource                                                  *
 * ------------------------------------------------------------------ */

/** Keeps only scopes we know; no requested scope means the read-only default. */
export function parseRequestedScopes(raw: string | null | undefined): string[] {
    const requested = (raw ?? "").split(/\s+/).filter(Boolean);
    const known = requested.filter(s => SUPPORTED_SCOPES.includes(s));
    if (known.length === 0) return [...DEFAULT_SCOPES];
    return SUPPORTED_SCOPES.filter(s => known.includes(s));
}

export function resourceMatches(resource: string | null | undefined, request?: Request): boolean {
    if (!resource) return true;
    const norm = (u: string) => u.replace(/\/+$/, "");
    return norm(resource) === norm(getMcpResourceUrl(request));
}

/* ------------------------------------------------------------------ *
 *  Authorization codes                                                *
 * ------------------------------------------------------------------ */

export async function createAuthorizationCode(input: {
    clientId: string;
    userId: string;
    workspaceId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    resource: string | null;
}): Promise<string> {
    const code = randomToken("mtx_ac_", 32);
    await prisma.oAuthAuthorizationCode.create({
        data: {
            code_hash: sha256(code),
            client_id: input.clientId,
            user_id: input.userId,
            workspace_id: input.workspaceId,
            redirect_uri: input.redirectUri,
            code_challenge: input.codeChallenge,
            code_challenge_method: "S256",
            scope: input.scope,
            resource: input.resource,
            expires_at: new Date(Date.now() + CODE_TTL_S * 1000),
        },
    });
    return code;
}

function pkceS256(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
}

export interface TokenResponse {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token: string;
    scope: string;
}

async function issueTokens(grantId: string, scope: string): Promise<TokenResponse> {
    const accessToken = randomToken("mtx_at_", 32);
    const refreshToken = randomToken("mtx_rt_", 32);
    const now = Date.now();
    await prisma.oAuthToken.createMany({
        data: [
            { grant_id: grantId, type: "access", token_hash: sha256(accessToken), expires_at: new Date(now + ACCESS_TOKEN_TTL_S * 1000) },
            { grant_id: grantId, type: "refresh", token_hash: sha256(refreshToken), expires_at: new Date(now + REFRESH_TOKEN_TTL_S * 1000) },
        ],
    });
    return { access_token: accessToken, token_type: "Bearer", expires_in: ACCESS_TOKEN_TTL_S, refresh_token: refreshToken, scope };
}

type GrantResult = { ok: true; tokens: TokenResponse } | { ok: false; error: string; description: string };

export async function exchangeAuthorizationCode(input: {
    code: string;
    clientId: string;
    redirectUri: string | null;
    codeVerifier: string | null;
    resource: string | null;
}): Promise<GrantResult> {
    const invalid = (description: string): GrantResult => ({ ok: false, error: "invalid_grant", description });

    if (!input.codeVerifier || !/^[A-Za-z0-9\-._~]{43,128}$/.test(input.codeVerifier)) {
        return { ok: false, error: "invalid_request", description: "code_verifier ausente ou inválido (PKCE é obrigatório)." };
    }

    const codeHash = sha256(input.code);
    const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { code_hash: codeHash } });
    if (!record) return invalid("Código de autorização inválido.");

    // Single use, claimed atomically so two concurrent exchanges can't both succeed
    const claimed = await prisma.oAuthAuthorizationCode.updateMany({
        where: { code_hash: codeHash, used_at: null, expires_at: { gt: new Date() } },
        data: { used_at: new Date() },
    });
    if (claimed.count !== 1) return invalid("Código de autorização expirado ou já utilizado.");

    if (record.client_id !== input.clientId) return invalid("O código foi emitido para outro cliente.");
    if (input.redirectUri && input.redirectUri !== record.redirect_uri) return invalid("redirect_uri diferente do usado na autorização.");
    if (!safeEqual(pkceS256(input.codeVerifier), record.code_challenge)) return invalid("Falha na verificação PKCE.");
    if (input.resource && record.resource && input.resource.replace(/\/+$/, "") !== record.resource.replace(/\/+$/, "")) {
        return { ok: false, error: "invalid_target", description: "resource diferente do autorizado." };
    }

    const grant = await prisma.oAuthGrant.create({
        data: {
            client_id: record.client_id,
            user_id: record.user_id,
            workspace_id: record.workspace_id,
            scope: record.scope,
            resource: record.resource,
        },
    });
    return { ok: true, tokens: await issueTokens(grant.id, record.scope) };
}

export async function refreshAccessToken(input: { refreshToken: string; clientId: string; scope: string | null }): Promise<GrantResult> {
    const invalid = (description: string): GrantResult => ({ ok: false, error: "invalid_grant", description });

    const tokenHash = sha256(input.refreshToken);
    const token = await prisma.oAuthToken.findUnique({ where: { token_hash: tokenHash }, include: { grant: true } });
    if (!token || token.type !== "refresh") return invalid("Refresh token inválido.");
    if (token.grant.client_id !== input.clientId) return invalid("Refresh token emitido para outro cliente.");
    if (token.grant.revoked_at) return invalid("Acesso revogado pelo usuário.");

    // Rotation: the presented token dies in the same step that issues its replacement
    const claimed = await prisma.oAuthToken.updateMany({
        where: { token_hash: tokenHash, revoked_at: null, expires_at: { gt: new Date() } },
        data: { revoked_at: new Date() },
    });
    if (claimed.count !== 1) return invalid("Refresh token expirado ou já utilizado.");

    // A narrower scope may be requested on refresh, never a broader one
    let scope = token.grant.scope;
    if (input.scope) {
        const granted = token.grant.scope.split(" ");
        const requested = input.scope.split(/\s+/).filter(s => s && s !== "offline_access");
        if (requested.some(s => !granted.includes(s))) {
            return { ok: false, error: "invalid_scope", description: "Escopo solicitado excede o autorizado." };
        }
        if (requested.length > 0) scope = requested.join(" ");
    }

    // Tidy up dead tokens of this grant so the table doesn't grow forever
    await prisma.oAuthToken.deleteMany({
        where: { grant_id: token.grant_id, OR: [{ expires_at: { lt: new Date() } }, { revoked_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }] },
    });

    return { ok: true, tokens: await issueTokens(token.grant_id, scope) };
}

/** RFC 7009: revoking either token kills the whole grant (the connection in Claude). */
export async function revokeToken(rawToken: string, clientId: string | null): Promise<void> {
    const token = await prisma.oAuthToken.findUnique({ where: { token_hash: sha256(rawToken) }, include: { grant: true } });
    if (!token) return;
    if (clientId && token.grant.client_id !== clientId) return;
    await revokeGrant(token.grant_id);
}

export async function revokeGrant(grantId: string): Promise<void> {
    const now = new Date();
    await prisma.$transaction([
        prisma.oAuthGrant.update({ where: { id: grantId }, data: { revoked_at: now } }),
        prisma.oAuthToken.updateMany({ where: { grant_id: grantId, revoked_at: null }, data: { revoked_at: now } }),
    ]);
}

/* ------------------------------------------------------------------ *
 *  Bearer validation (resource server side)                           *
 * ------------------------------------------------------------------ */

export interface McpAuthContext {
    grantId: string;
    userId: string;
    workspaceId: string;
    scopes: string[];
    isSuperAdmin: boolean;
    allowedAccountIds: string[] | null;
    userEmail: string;
}

export async function verifyAccessToken(rawToken: string | null, request?: Request): Promise<McpAuthContext | null> {
    if (!rawToken) return null;
    const token = await prisma.oAuthToken.findUnique({
        where: { token_hash: sha256(rawToken) },
        include: {
            grant: {
                include: {
                    user: { select: { id: true, email: true, workspace_id: true, is_super_admin: true, allowed_account_ids: true } },
                },
            },
        },
    });
    if (!token || token.type !== "access" || token.revoked_at || token.expires_at < new Date()) return null;
    const { grant } = token;
    if (grant.revoked_at) return null;
    if (!resourceMatches(grant.resource, request)) return null;
    // The user may have been moved to another workspace since authorizing
    if (grant.user.workspace_id !== grant.workspace_id) return null;

    if (!grant.last_used_at || Date.now() - grant.last_used_at.getTime() > 5 * 60 * 1000) {
        await prisma.oAuthGrant.update({ where: { id: grant.id }, data: { last_used_at: new Date() } }).catch(() => {});
    }

    let allowedAccountIds: string[] | null = null;
    if (grant.user.allowed_account_ids) {
        try { allowedAccountIds = JSON.parse(grant.user.allowed_account_ids); } catch { allowedAccountIds = null; }
    }

    return {
        grantId: grant.id,
        userId: grant.user.id,
        workspaceId: grant.workspace_id,
        scopes: grant.scope.split(" ").filter(Boolean),
        isSuperAdmin: grant.user.is_super_admin,
        allowedAccountIds,
        userEmail: grant.user.email,
    };
}

export function bearerFrom(request: Request): string | null {
    const auth = request.headers.get("authorization");
    if (!auth) return null;
    const [scheme, value] = auth.split(" ");
    return scheme?.toLowerCase() === "bearer" && value ? value.trim() : null;
}

/** 401 that starts Claude's sign-in: points at the PRM document and the scopes to request. */
export function unauthorizedResponse(request: Request, hadToken: boolean): Response {
    const params = [
        `resource_metadata="${getResourceMetadataUrl(request)}"`,
        `scope="${SUPPORTED_SCOPES.join(" ")}"`,
        ...(hadToken ? [`error="invalid_token"`, `error_description="Token inválido, expirado ou revogado"`] : []),
    ];
    return jsonResponse(
        { error: hadToken ? "invalid_token" : "unauthorized", error_description: "Autenticação OAuth necessária." },
        401,
        { "WWW-Authenticate": `Bearer ${params.join(", ")}` },
    );
}
