import { corsPreflight, jsonResponse, oauthError, registerClient, registrationRateLimited } from "@/lib/mcp/oauth";

// RFC 7591 Dynamic Client Registration: Claude registers itself here on first connect
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (registrationRateLimited(ip)) {
        return oauthError("temporarily_unavailable", "Muitos registros a partir deste IP. Tente mais tarde.", 429);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return oauthError("invalid_client_metadata", "Corpo JSON inválido.");
    }

    const result = await registerClient(body);
    return jsonResponse(result.body, result.status);
}

export async function OPTIONS() {
    return corsPreflight();
}
