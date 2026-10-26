import { authorizationServerMetadata, corsPreflight, jsonResponse } from "@/lib/mcp/oauth";

// RFC 8414: authorization server metadata
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    return jsonResponse(authorizationServerMetadata(request), 200, { "Cache-Control": "public, max-age=300" });
}

export async function OPTIONS() {
    return corsPreflight();
}
