/**
 * UazAPI Client — Self-hosted WhatsApp Gateway
 *
 * Docs: https://docs.uazapi.com
 *
 * Endpoint paths below follow the UazAPI self-hosted (uazapiGO) convention.
 * If your server uses different paths, update the PATHS constants.
 */

// ── Endpoint paths (confirmed by probing metrixbr.uazapi.com) ─────────────────
const PATHS = {
    sendText: '/send/text',         // POST — send text message
    status:   '/instance/status',   // GET  — connection state
    connect:  '/instance/connect',  // POST — initiate connection / returns QR code
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

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
    // Remove all non-digits
    return phone.replace(/\D/g, '');
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
    const { baseUrl, token, instance } = config;

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return { success: false, error: 'Número de telefone inválido' };

    try {
        // uazapiGO (WuzAPI-based) requires @s.whatsapp.net suffix and capital field names
        const waPhone = `${cleanPhone}@s.whatsapp.net`;

        const resp = await fetch(`${baseUrl}${PATHS.sendText}`, {
            method:  'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({
                // WuzAPI/uazapiGO Go struct fields (capital)
                Phone:   waPhone,
                Body:    text,
                // Lowercase aliases for compatibility
                number:  waPhone,
                phone:   waPhone,
                body:    text,
                message: text,
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
        console.error('[UazAPI] sendText error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get current connection status of the WhatsApp instance.
 */
export async function getInstanceStatus(config: UazAPIConfig): Promise<InstanceStatus> {
    const { baseUrl, token } = config;

    try {
        const resp = await fetch(`${baseUrl}${PATHS.status}`, {
            headers: buildHeaders(token),
        });

        const envelope = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            return { connected: false, loggedIn: false, state: 'error' };
        }

        // UazAPI wraps response in { code, message, data: { ... } }
        const d = envelope?.data || envelope;
        const state: string = d?.status || d?.state || d?.connection_status || d?.connectionState || '';
        const connected = state === 'open' || state === 'connected' || state === 'qrReadSuccess' || d?.connected === true;
        const loggedIn  = connected && (d?.loggedIn !== false);

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
    const { baseUrl, token } = config;

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
