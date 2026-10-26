import { corsPreflight, jsonResponse, protectedResourceMetadata } from "@/lib/mcp/oauth";

// Path-suffixed variant that clients probe for the /api/mcp resource (RFC 9728 section 3.1)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    return jsonResponse(protectedResourceMetadata(request), 200, { "Cache-Control": "public, max-age=300" });
}

export async function OPTIONS() {
    return corsPreflight();
}
