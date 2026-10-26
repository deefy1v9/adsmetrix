import { authenticateClient, corsPreflight, CORS_HEADERS, readClientId, resolveClient, revokeToken, oauthError } from "@/lib/mcp/oauth";

// RFC 7009: always 200, even for unknown tokens, so token validity cannot be probed
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const form = new URLSearchParams(await request.text());
    const token = form.get("token");
    const clientId = readClientId(request, form);

    if (clientId) {
        const client = await resolveClient(clientId);
        if (client && !authenticateClient(client, request, form)) {
            return oauthError("invalid_client", "Credenciais do cliente inválidas.", 401);
        }
    }
    if (token) await revokeToken(token, clientId);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function OPTIONS() {
    return corsPreflight();
}
