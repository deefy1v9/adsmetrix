/**
 * UazAPI Client — Self-hosted WhatsApp Gateway
 *
 * Docs: https://docs.uazapi.com
 *
 * Endpoint paths below follow the UazAPI self-hosted (uazapiGO) convention.
 * If your server uses different paths, update the PATHS constants.
 */

// ── Endpoint paths (confirmed via docs.uazapi.com/api/v1/openapi-bundled) ─────
const PATHS = {
    sendText: '/send/text',         // POST — body: { number, text }
    status:   '/instance/status',   // GET  — connection state
    connect:  '/instance/connect',  // POST — initiate connection / returns QR code
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WhatsAppGroup {
    id:   string; // e.g. "120363XXXXXXXXX@g.us"
    name: string;
}

export interface UazAPIConfig {
    baseUrl:  string;  // ex: https://meu-servidor.com (sem trailing slash)
    token:    string;  // API key de autenticação
    instance: string;  // nome/ID da instância WhatsApp
}

export interface SendResult {
    success:   boolean;
    messageId?: string;
    error?:    string;
}

export interface InstanceStatus {
    connected: boolean;
    loggedIn:  boolean;
    state?:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHeaders(token: string) {
    return {
        'Content-Type': 'application/json',
        'token': token,  // UazAPI uses 'token' header for authentication
    };
}

function normalizePhone(phone: string): string {
    // Group JIDs like 120363XXXXXXXXX@g.us must be passed as-is
    if (phone.includes('@')) return phone.trim();
    return phone.replace(/\D/g, '');
}

function normalizeBaseUrl(url: string): string {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Send a plain text message via UazAPI.
 */
export async function sendTextMessage(
    config: UazAPIConfig,
    phone:  string,
    text:   string,
): Promise<SendResult> {
    const { token, instance } = config;
    const baseUrl = normalizeBaseUrl(config.baseUrl);

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return { success: false, error: 'Número de telefone inválido' };

    try {
        const url = `${baseUrl}${PATHS.sendText}`;
        console.log('[UazAPI] sendText →', url, 'phone:', cleanPhone);
        const resp = await fetch(url, {
            method:  'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({
                number: cleanPhone,  // international format, no @suffix
                text:   text,
            }),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            const msg = data?.message || data?.error || `HTTP ${resp.status}`;
            console.error('[UazAPI] sendText failed:', msg);
            return { success: false, error: msg };
        }

        return {
            success:   true,
            messageId: data?.key?.id || data?.id || data?.messageId || undefined,
        };
    } catch (err: any) {
        const cause = (err as any)?.cause?.message ?? '';
        console.error('[UazAPI] sendText error:', err.message, cause);
        return { success: false, error: cause ? `${err.message}: ${cause}` : err.message };
    }
}

/**
 * Get current connection status of the WhatsApp instance.
 */
export async function getInstanceStatus(config: UazAPIConfig): Promise<InstanceStatus> {
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const { token } = config;

    try {
        const resp = await fetch(`${baseUrl}${PATHS.status}`, {
            headers: buildHeaders(token),
        });

        const envelope = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            return { connected: false, loggedIn: false, state: 'error' };
        }

        // UazAPI response: { code, message, data: { instance: { status: string }, status: { connected: bool, loggedIn: bool } } }
        const d = envelope?.data || envelope;

        // d.status is an OBJECT { connected: bool, loggedIn: bool }, not a string
        const liveStatus  = d?.status;          // { connected, loggedIn }
        const instanceStr = d?.instance?.status as string | undefined; // "connected" | "disconnected" | "connecting"

        const connected =
            liveStatus?.connected === true ||
            instanceStr === 'connected' ||
            instanceStr === 'open' ||
            // legacy / other flavours
            d?.connected === true;

        const loggedIn = connected && (liveStatus?.loggedIn !== false) && (d?.loggedIn !== false);
        const state    = instanceStr || (connected ? 'connected' : 'disconnected');

        return { connected, loggedIn, state };
    } catch {
        return { connected: false, loggedIn: false, state: 'unreachable' };
    }
}

/**
 * Initiate connection and return QR code (base64) for pairing.
 * POST /instance/connect returns the QR code when the instance is not yet connected.
 * Returns null if already connected or if the request fails.
 */
export async function getQRCode(config: UazAPIConfig): Promise<string | null> {
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const { token } = config;

    try {
        const resp = await fetch(`${baseUrl}${PATHS.connect}`, {
            method:  'POST',
            headers: buildHeaders(token),
            body:    JSON.stringify({}),
        });

        const envelope = await resp.json().catch(() => ({}));

        if (!resp.ok) return null;

        // UazAPI wraps response: { code, message, data: { qrcode: "base64..." } }
        const d = envelope?.data || envelope;
        return (
            d?.qrcode?.base64 ||
            d?.qrcode ||
            d?.base64 ||
            d?.code ||
            envelope?.qrcode ||
            null
        );
    } catch {
        return null;
    }
}

/**
 * @deprecated Use getQRCode directly — it triggers connect internally.
 */
export async function connectInstance(config: UazAPIConfig): Promise<void> {
    await getQRCode(config);
}

/**
 * List all WhatsApp groups the connected instance participates in.
 * Returns an empty array if the instance is not connected or the request fails.
 */
export async function getGroups(config: UazAPIConfig): Promise<{ groups: WhatsAppGroup[]; error?: string }> {
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const { token } = config;

    try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 10_000);

        const resp = await fetch(`${baseUrl}/group/list`, {
            headers: buildHeaders(token),
            signal:  controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        const text = await resp.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch { /* not JSON */ }

        if (!resp.ok) {
            return { groups: [], error: `HTTP ${resp.status}: ${text.slice(0, 120)}` };
        }

        // Response: { groups: [{ JID, Name, ... }] }
        const list: any[] = Array.isArray(data?.groups) ? data.groups
                          : Array.isArray(data?.data)   ? data.data
                          : Array.isArray(data)         ? data
                          : [];

        const groups = list.map(g => ({
            id:   String(g.JID  ?? g.id   ?? g.jid     ?? ''),
            name: String(g.Name ?? g.name ?? g.subject  ?? g.JID ?? ''),
        })).filter(g => g.id);

        return { groups };
    } catch (err: any) {
        return { groups: [], error: err.name === 'AbortError' ? 'Timeout de 10s — verifique a URL do servidor' : err.message };
    }
}
