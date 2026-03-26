'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendTextMessage, getInstanceStatus, getQRCode, connectInstance, getGroups, WhatsAppGroup, UazAPIConfig } from '@/lib/uazapi';

async function getWorkspaceId(): Promise<string | null> {
    const h = await headers();
    return h.get('x-workspace-id');
}

async function getConfig(): Promise<UazAPIConfig | null> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return null;

    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
    if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) return null;

    return {
        baseUrl:  setting.uazapi_url.replace(/\/$/, ''), // remove trailing slash
        token:    setting.uazapi_token,
        instance: setting.uazapi_instance,
    };
}

// ── Status & QR ──────────────────────────────────────────────────────────────

export async function getUazAPIStatusAction() {
    const config = await getConfig();

    if (!config) {
        return { configured: false, connected: false, loggedIn: false };
    }

    const status = await getInstanceStatus(config);
    return { configured: true, ...status };
}

export async function getUazAPIQRCodeAction(): Promise<{ qrcode: string | null }> {
    const config = await getConfig();
    if (!config) return { qrcode: null };

    // Trigger connect first (idempotent — server ignores if already connected)
    await connectInstance(config);

    const qrcode = await getQRCode(config);
    return { qrcode };
}

// ── Config Save ───────────────────────────────────────────────────────────────

export async function saveUazAPIConfigAction(data: {
    uazapi_url:      string;
    uazapi_token:    string;
    uazapi_instance: string;
    whatsapp_number: string;
}) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.setting.upsert({
            where:  { workspace_id: workspaceId },
            update: {
                uazapi_url:      data.uazapi_url.trim(),
                uazapi_token:    data.uazapi_token.trim(),
                uazapi_instance: data.uazapi_instance.trim(),
                whatsapp_number: data.whatsapp_number.replace(/\D/g, ''),
                whatsapp_enabled: true,
            },
            create: {
                workspace_id:    workspaceId,
                uazapi_url:      data.uazapi_url.trim(),
                uazapi_token:    data.uazapi_token.trim(),
                uazapi_instance: data.uazapi_instance.trim(),
                whatsapp_number: data.whatsapp_number.replace(/\D/g, ''),
                whatsapp_enabled: true,
            },
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Test Send ─────────────────────────────────────────────────────────────────

export async function sendTestMessageAction(text?: string) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });

    if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) {
        return { success: false, error: 'UazAPI não configurado. Preencha URL, token e instância.' };
    }
    if (!setting?.whatsapp_number) {
        return { success: false, error: 'Número destino não configurado.' };
    }

    const config: UazAPIConfig = {
        baseUrl:  setting.uazapi_url.replace(/\/$/, ''),
        token:    setting.uazapi_token,
        instance: setting.uazapi_instance,
    };

    const message = text || `✅ *Teste de conexão Bilula*\n\nSe você recebeu esta mensagem, a integração com WhatsApp está funcionando corretamente!\n\n_${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;

    return sendTextMessage(config, setting.whatsapp_number, message);
}

// ── Toggle Daily Report per Account ──────────────────────────────────────────

export async function toggleDailyReportAction(accountId: string, enabled: boolean) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        // account.id from MetaAdAccount is account_id (Meta platform ID, e.g. "act_123")
        await prisma.account.updateMany({
            where: { account_id: accountId, workspace_id: workspaceId },
            data:  { daily_report_enabled: enabled },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Get Workspace Setting ─────────────────────────────────────────────────────

export async function getWorkspaceSettingAction() {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return null;

    const setting = await prisma.setting.findUnique({
        where:  { workspace_id: workspaceId },
        select: {
            whatsapp_enabled:        true,
            uazapi_url:              true,
            uazapi_token:            true,
            uazapi_instance:         true,
            whatsapp_number:         true,
            combined_report_enabled: true,
        },
    });

    return setting;
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroupsAction(): Promise<WhatsAppGroup[]> {
    const config = await getConfig();
    if (!config) return [];
    return getGroups(config);
}

// ── Combined Report Config ────────────────────────────────────────────────────

export async function toggleCombinedReportAction(enabled: boolean) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.setting.upsert({
            where:  { workspace_id: workspaceId },
            update: { combined_report_enabled: enabled },
            create: { workspace_id: workspaceId, combined_report_enabled: enabled },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
