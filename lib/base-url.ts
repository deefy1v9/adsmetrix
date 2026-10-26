/**
 * Public origin of the app, without trailing slash. Used to build OAuth redirect URIs and
 * the MCP resource identifier, which must match exactly what users paste into Claude.
 *
 * APP_URL is read at runtime; NEXT_PUBLIC_APP_URL is inlined at build time. When neither is
 * set (local dev), the request's forwarded host is used.
 */
export function getBaseUrl(request?: Request): string {
    const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (configured) return configured.replace(/\/+$/, "");

    if (request) {
        const url = new URL(request.url);
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
        const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        return `${proto}://${host}`;
    }
    return "http://localhost:3000";
}

/**
 * For server components and server actions, which have no Request object: rebuilds a
 * minimal one from the incoming headers so getBaseUrl's fallback still works.
 */
export async function requestFromHeaders(): Promise<Request> {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return new Request(`${proto}://${host}/`, { headers: { host } });
}
