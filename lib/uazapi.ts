/**
 * UazAPI Client — Self-hosted WhatsApp Gateway
 *
 * Docs: https://docs.uazapi.com
 *
 * Endpoint paths below follow the UazAPI self-hosted (uazapiGO) convention.
 * If your server uses different paths, update the PATHS constants.
 */

// ── Endpoint paths (adjust if your server version differs) ───────────────────
const PATHS = {
    sendText:   '/message/send',       // POST — send text message
    status:     '/instance/status',    // GET  — connection state
    qrcode:     '/instance/qrcode',    // GET  — QR code for pairing
    connect:    '/instance/connect',   // POST — initiate connection
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
        'Authorization': `Bearer ${token}`,
        // Some UazAPI versions also accept token as a plain header:
        'token': token,
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
        const resp = await fetch(`${baseUrl}${PATHS.sendText}`, {
            method:  'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({
                // UazAPI common body format — some versions use "number", others "phone"
                phone:    cleanPhone,
                number:   cleanPhone,
                message:  text,
                body:     text,
                instance,
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
    const { baseUrl, token, instance } = config;

    try {
        const resp = await fetch(
            `${baseUrl}${PATHS.status}?instance=${encodeURIComponent(instance)}`,
            { headers: buildHeaders(token) },
        );

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            return { connected: false, loggedIn: false, state: 'error' };
        }

        // Handle common response shapes from different UazAPI versions
        const state: string = data?.state || data?.status || data?.connectionState || '';
        const connected = state === 'open' || state === 'connected' || data?.connected === true;
        const loggedIn  = connected && (data?.loggedIn !== false);

        return { connected, loggedIn, state };
    } catch {
        return { connected: false, loggedIn: false, state: 'unreachable' };
    }
}

/**
 * Get QR code (base64) for pairing a new WhatsApp account.
 * Returns null if already connected or if the request fails.
 */
export async function getQRCode(config: UazAPIConfig): Promise<string | null> {
    const { baseUrl, token, instance } = config;

    try {
        const resp = await fetch(
            `${baseUrl}${PATHS.qrcode}?instance=${encodeURIComponent(instance)}`,
            { headers: buildHeaders(token) },
        );

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) return null;

        // Handle common response shapes
        return (
            data?.qrcode?.base64 ||
            data?.qrcode ||
            data?.base64 ||
            data?.code ||
            null
        );
    } catch {
        return null;
    }
}

/**
 * Initiate connection (triggers QR generation on the server).
 */
export async function connectInstance(config: UazAPIConfig): Promise<void> {
    const { baseUrl, token, instance } = config;

    try {
        await fetch(`${baseUrl}${PATHS.connect}`, {
            method:  'POST',
            headers: buildHeaders(token),
            body:    JSON.stringify({ instance }),
        });
    } catch {
        // Fire and forget — caller will poll status/qrcode separately
    }
}
