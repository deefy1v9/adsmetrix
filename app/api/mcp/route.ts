import { bearerFrom, corsPreflight, jsonResponse, unauthorizedResponse, verifyAccessToken, CORS_HEADERS } from "@/lib/mcp/oauth";
import { handleMessage, type JsonRpcResponse } from "@/lib/mcp/server";

/**
 * MCP endpoint (Streamable HTTP, stateless). Add to Claude as a custom connector:
 *   Settings → Connectors → Add custom connector → https://<app>/api/mcp
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
    const token = bearerFrom(request);
    const ctx = await verifyAccessToken(token, request);
    if (!ctx) return unauthorizedResponse(request, !!token);

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }

    if (Array.isArray(payload)) {
        if (payload.length === 0) return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }, 400);
        const responses = (await Promise.all(payload.map(m => handleMessage(m, ctx)))).filter((r): r is JsonRpcResponse => r !== null);
        return responses.length ? jsonResponse(responses) : new Response(null, { status: 202, headers: CORS_HEADERS });
    }

    const response = await handleMessage(payload, ctx);
    // Notifications and responses are acknowledged with 202 and no body
    return response ? jsonResponse(response) : new Response(null, { status: 202, headers: CORS_HEADERS });
}

// No server-initiated SSE stream: the spec allows answering GET with 405
export async function GET(request: Request) {
    const token = bearerFrom(request);
    const ctx = await verifyAccessToken(token, request);
    if (!ctx) return unauthorizedResponse(request, !!token);
    return new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

// Stateless server: there is no session to terminate
export async function DELETE() {
    return new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

export async function OPTIONS() {
    return corsPreflight();
}
