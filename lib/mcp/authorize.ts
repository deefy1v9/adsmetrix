import type { OAuthClient } from "@prisma/client";
import {
    clientRedirectUris, getIssuer, parseRequestedScopes, redirectUriMatches, resolveClient, resourceMatches,
} from "./oauth";

export const AUTHORIZE_PARAMS = [
    "response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource",
] as const;

export type AuthorizeParams = Partial<Record<typeof AUTHORIZE_PARAMS[number], string>>;

export type AuthorizeValidation =
    | { ok: true; client: OAuthClient; redirectUri: string; scopes: string[]; params: AuthorizeParams }
    /** Problem with the client or redirect URI: must not redirect, show an error page */
    | { ok: false; fatal: string }
    /** Problem reportable to the client: redirect back with error params */
    | { ok: false; redirectTo: string };

export function pickAuthorizeParams(source: Record<string, unknown> | FormData): AuthorizeParams {
    const get = (k: string) => {
        const v = source instanceof FormData ? source.get(k) : source[k];
        const s = Array.isArray(v) ? v[0] : v;
        return typeof s === "string" && s.length <= 2000 ? s : undefined;
    };
    return Object.fromEntries(AUTHORIZE_PARAMS.map(k => [k, get(k)]).filter(([, v]) => v !== undefined));
}

export function buildRedirect(redirectUri: string, params: Record<string, string | undefined>): string {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
    return url.toString();
}

/**
 * Validates an authorization request (RFC 6749 §4.1.1 + PKCE + RFC 8707 resource).
 * The same function runs when the consent page renders and again when the user submits it,
 * so tampered hidden fields are rejected.
 */
export async function validateAuthorizeRequest(params: AuthorizeParams, request?: Request): Promise<AuthorizeValidation> {
    const client = await resolveClient(params.client_id);
    if (!client) return { ok: false, fatal: "Aplicativo cliente desconhecido. Remova o conector no Claude e adicione novamente." };

    const registered = clientRedirectUris(client);
    let redirectUri = params.redirect_uri;
    if (!redirectUri && registered.length === 1) redirectUri = registered[0];
    if (!redirectUri || !redirectUriMatches(registered, redirectUri)) {
        return { ok: false, fatal: "O endereço de retorno (redirect_uri) não está registrado para este aplicativo." };
    }

    const iss = getIssuer(request);
    const fail = (error: string, description: string): AuthorizeValidation => ({
        ok: false,
        redirectTo: buildRedirect(redirectUri!, { error, error_description: description, state: params.state, iss }),
    });

    if (params.response_type !== "code") return fail("unsupported_response_type", "Somente response_type=code é suportado.");
    if (!params.code_challenge || !/^[A-Za-z0-9\-._~]{43,128}$/.test(params.code_challenge)) {
        return fail("invalid_request", "code_challenge (PKCE) é obrigatório.");
    }
    if (params.code_challenge_method !== "S256") return fail("invalid_request", "code_challenge_method deve ser S256.");
    if (!resourceMatches(params.resource, request)) return fail("invalid_target", "resource não corresponde a este servidor MCP.");

    return { ok: true, client, redirectUri, scopes: parseRequestedScopes(params.scope), params };
}
