/**
 * WhatsApp Business Cloud API Integration
 * Official Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn('WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env');
}

const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

export interface WhatsAppTemplateParameter {
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
    };
    date_time?: {
        fallback_value: string;
    };
    image?: {
        link: string;
    };
    document?: {
        link: string;
        filename?: string;
    };
}

export interface WhatsAppTemplateComponent {
    type: 'header' | 'body' | 'button';
    parameters: WhatsAppTemplateParameter[];
    sub_type?: 'url' | 'quick_reply';
    index?: number;
}

export interface SendTemplateMessageParams {
    to: string; // Phone number in international format (e.g., "5511999999999")
    templateName: string; // Name of the approved template
    languageCode?: string; // Default: 'pt_BR'
    components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppApiResponse {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

export interface WhatsAppApiError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id: string;
    };
}

/**
 * Send a template message via WhatsApp Business API
 * Templates must be pre-approved in Meta Business Manager
 * 
 * @param params - Template message parameters
 * @returns Promise with message ID or error
 */
export async function sendTemplateMessage(params: SendTemplateMessageParams): Promise<WhatsAppApiResponse> {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp API credentials not configured');
    }

    const { to, templateName, languageCode = 'pt_BR', components = [] } = params;

    // Validate phone number format (remove spaces, dashes, parentheses)
    const cleanPhone = to.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone.match(/^\d{10,15}$/)) {
        throw new Error('Invalid phone number format. Use international format without + (e.g., 5511999999999)');
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: components.length > 0 ? components : undefined
        }
    };

    try {
        const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const error = data as WhatsAppApiError;
            throw new Error(`WhatsApp API Error: ${error.error.message} (Code: ${error.error.code})`);
        }

        return data as WhatsAppApiResponse;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

/**
 * Helper function to send daily report to a client
 * 
 * @param clientPhone - Client's WhatsApp number
 * @param clientName - Client's name
 * @param campaignSpend - Amount spent today
 * @param remainingBudget - Remaining budget
 * @param reportLink - Optional PDF report link
 */
export async function sendDailyReport(
    clientPhone: string,
    clientName: string,
    campaignSpend: number,
    remainingBudget: number,
    reportLink?: string
) {
    const components: WhatsAppTemplateComponent[] = [
        {
            type: 'body',
            parameters: [
                {
                    type: 'text',
                    text: clientName
                },
                {
                    type: 'currency',
                    currency: {
                        fallback_value: `R$ ${campaignSpend.toFixed(2)}`,
                        code: 'BRL',
                        amount_1000: Math.round(campaignSpend * 1000)
                    }
                },
                {
                    type: 'currency',
                    currency: {
                        fallback_value: `R$ ${remainingBudget.toFixed(2)}`,
                        code: 'BRL',
                        amount_1000: Math.round(remainingBudget * 1000)
                    }
                }
            ]
        }
    ];

    // Add button with report link if provided
    if (reportLink) {
        components.push({
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
                {
                    type: 'text',
                    text: reportLink
                }
            ]
        });
    }

    return sendTemplateMessage({
        to: clientPhone,
        templateName: 'daily_campaign_report', // This template must be created and approved in Meta Business Manager
        languageCode: 'pt_BR',
        components
    });
}

/**
 * Send a document (PDF) via WhatsApp
 * 
 * @param clientPhone - Client's WhatsApp number
 * @param documentUrl - Public URL of the PDF document
 * @param filename - Optional filename
 */
export async function sendDocument(
    clientPhone: string,
    documentUrl: string,
    filename?: string
) {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp API credentials not configured');
    }

    const cleanPhone = clientPhone.replace(/[\s\-\(\)]/g, '');

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'document',
        document: {
            link: documentUrl,
            filename: filename || 'relatorio.pdf'
        }
    };

    try {
        const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const error = data as WhatsAppApiError;
            throw new Error(`WhatsApp API Error: ${error.error.message} (Code: ${error.error.code})`);
        }

        return data as WhatsAppApiResponse;
    } catch (error) {
        console.error('Error sending WhatsApp document:', error);
        throw error;
    }
}
