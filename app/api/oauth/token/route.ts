import {
    authenticateClient, corsPreflight, exchangeAuthorizationCode, jsonResponse, oauthError,
    readClientId, refreshAccessToken, resolveClient,
} from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

async function readForm(request: Request): Promise<URLSearchParams> {
    const text = await request.text();
    // RFC 6749 mandates form encoding; JSON is accepted for lenient clients
    if (request.headers.get("content-type")?.includes("application/json")) {
        try {
            const json = JSON.parse(text);
            return new URLSearchParams(Object.entries(json).map(([k, v]) => [k, String(v)]));
        } catch { /* fall through */ }
    }
    return new URLSearchParams(text);
}

export async function POST(request: Request) {
    const form = await readForm(request);
    const grantType = form.get("grant_type");

    const clientId = readClientId(request, form);
    const client = await resolveClient(clientId);
    if (!client) return oauthError("invalid_client", "Cliente OAuth desconhecido.", 401);
    if (!authenticateClient(client, request, form)) return oauthError("invalid_client", "Credenciais do cliente inválidas.", 401);

    if (grantType === "authorization_code") {
        const code = form.get("code");
        if (!code) return oauthError("invalid_request", "code é obrigatório.");
        const result = await exchangeAuthorizationCode({
            code,
            clientId: client.client_id,
            redirectUri: form.get("redirect_uri"),
            codeVerifier: form.get("code_verifier"),
            resource: form.get("resource"),
        });
        return result.ok
            ? jsonResponse(result.tokens, 200, { Pragma: "no-cache" })
            : oauthError(result.error, result.description);
    }

    if (grantType === "refresh_token") {
        const refreshToken = form.get("refresh_token");
        if (!refreshToken) return oauthError("invalid_request", "refresh_token é obrigatório.");
        const result = await refreshAccessToken({ refreshToken, clientId: client.client_id, scope: form.get("scope") });
        return result.ok
            ? jsonResponse(result.tokens, 200, { Pragma: "no-cache" })
            : oauthError(result.error, result.description);
    }

    return oauthError("unsupported_grant_type", `grant_type não suportado: ${grantType ?? "(vazio)"}`);
}

export async function OPTIONS() {
    return corsPreflight();
}
