import { corsPreflight, jsonResponse, protectedResourceMetadata } from "@/lib/mcp/oauth";

// RFC 9728: tells MCP clients which authorization server protects /api/mcp
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    return jsonResponse(protectedResourceMetadata(request), 200, { "Cache-Control": "public, max-age=300" });
}

export async function OPTIONS() {
    return corsPreflight();
}
