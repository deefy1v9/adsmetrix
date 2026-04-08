/**
 * Meta WhatsApp Business Cloud API — dynamic credentials (per-workspace)
 * Supports template messages with a single body variable {{1}} for free-text automations.
 */

const API_VERSION = "v21.0";

export interface MetaWAConfig {
    phoneNumberId: string;
    accessToken: string;
}

export interface MetaWASendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

function apiUrl(phoneNumberId: string) {
    return `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
}

/**
 * Send a template message.
 * The template must have a body component with {{1}} as its first parameter.
 * bodyText is injected as the value of {{1}}.
 */
export async function sendTemplateWithText(
    config: MetaWAConfig,
    to: string,
    templateName: string,
    bodyText: string,
    languageCode = "pt_BR"
): Promise<MetaWASendResult> {
    const clean = to.replace(/[\s\-\(\)+]/g, "");
    if (!clean.match(/^\d{10,15}$/)) {
        return { success: false, error: `Número inválido: ${to}` };
    }

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: clean,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            components: [
                {
                    type: "body",
                    parameters: [{ type: "text", text: bodyText }],
                },
            ],
        },
    };

    try {
        const res = await fetch(apiUrl(config.phoneNumberId), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            const msg = data?.error?.message || `HTTP ${res.status}`;
            console.error("[MetaWA] sendTemplate error:", msg);
            return { success: false, error: msg };
        }

        return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
        console.error("[MetaWA] sendTemplate exception:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Fetch all approved message templates for this phone number.
 * Returns simplified list: { id, name, status, language }
 */
export async function fetchApprovedTemplates(
    config: MetaWAConfig
): Promise<{ id: string; name: string; status: string; language: string }[]> {
    // Fetch via WABA — first get the WABA id from the phone number
    try {
        const phoneRes = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${config.phoneNumberId}?fields=whatsapp_business_account&access_token=${config.accessToken}`
        );
        const phoneData = await phoneRes.json();
        const wabaId = phoneData?.whatsapp_business_account?.id;
        if (!wabaId) return [];

        const tplRes = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?fields=name,status,language&limit=50&access_token=${config.accessToken}`
        );
        const tplData = await tplRes.json();
        const list = tplData?.data ?? [];
        return list.map((t: any) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            language: t.language,
        }));
    } catch {
        return [];
    }
}
