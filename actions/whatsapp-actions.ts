'use server';

import { sendTemplateMessage, sendDailyReport, sendDocument } from '@/lib/whatsapp-api';

/**
 * Server Action to send a daily report via WhatsApp
 */
export async function sendDailyReportAction(
    clientPhone: string,
    clientName: string,
    campaignSpend: number,
    remainingBudget: number,
    reportLink?: string
) {
    try {
        const result = await sendDailyReport(
            clientPhone,
            clientName,
            campaignSpend,
            remainingBudget,
            reportLink
        );

        return {
            success: true,
            messageId: result.messages[0].id,
            data: result
        };
    } catch (error) {
        console.error('Error in sendDailyReportAction:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Server Action to send a custom template message
 */
export async function sendTemplateMessageAction(
    to: string,
    templateName: string,
    parameters?: Array<{ type: string; text: string }>
) {
    try {
        const components = parameters ? [{
            type: 'body' as const,
            parameters: parameters.map(p => ({
                type: p.type as 'text',
                text: p.text
            }))
        }] : [];

        const result = await sendTemplateMessage({
            to,
            templateName,
            components
        });

        return {
            success: true,
            messageId: result.messages[0].id,
            data: result
        };
    } catch (error) {
        console.error('Error in sendTemplateMessageAction:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Server Action to send a document via WhatsApp
 */
export async function sendDocumentAction(
    clientPhone: string,
    documentUrl: string,
    filename?: string
) {
    try {
        const result = await sendDocument(clientPhone, documentUrl, filename);

        return {
            success: true,
            messageId: result.messages[0].id,
            data: result
        };
    } catch (error) {
        console.error('Error in sendDocumentAction:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Server Action to get aggregated campaign metrics for reports
 */
export async function getCampaignMetricsAction(
    accountId: string,
    datePreset: string = 'last_30d'
) {
    try {
        const { fetchAggregatedMetricsAction } = await import('@/actions/meta-actions');
        const data = await fetchAggregatedMetricsAction(accountId, datePreset);

        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Error in getCampaignMetricsAction:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
