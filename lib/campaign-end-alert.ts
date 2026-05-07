/**
 * Campaign End-Date Alert
 *
 * Sends a single consolidated WhatsApp message per workspace listing
 * all ACTIVE campaigns that end today or tomorrow (BRT).
 *
 * Reuses the same group + alert time configured for balance alerts.
 * Iterates through ALL accounts in the workspace (not filtered by alert flags).
 */

import { prisma } from './prisma';
import { getCampaigns } from './meta-api';
import { sendTextMessage, UazAPIConfig } from './uazapi';

function dateBRT(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export async function checkCampaignEndAlertsForWorkspace(
    workspaceId: string,
    options: { skipTimeWindow?: boolean } = {},
): Promise<{ checked: number; alerted: number }> {
    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });

    if (
        !setting?.uazapi_url ||
        !setting?.uazapi_token ||
        !setting?.uazapi_instance ||
        !(setting as any).balance_alert_group_id
    ) {
        return { checked: 0, alerted: 0 };
    }

    if (!options.skipTimeWindow) {
        const alertTime = ((setting as any).balance_alert_time as string | null) ?? '09:00';
        const nowBR     = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const [alertH, alertM] = alertTime.split(':').map(Number);
        const alertMinutes     = alertH * 60 + alertM;
        const nowMinutes       = nowBR.getHours() * 60 + nowBR.getMinutes();
        if (nowMinutes !== alertMinutes) return { checked: 0, alerted: 0 };
    }

    const uazConfig: UazAPIConfig = {
        baseUrl:  setting.uazapi_url.replace(/\/$/, ''),
        token:    setting.uazapi_token,
        instance: setting.uazapi_instance,
    };
    const groupId = (setting as any).balance_alert_group_id as string;

    const accounts = await prisma.account.findMany({
        where: { workspace_id: workspaceId, is_hidden: false } as any,
    });
    if (!accounts.length) return { checked: 0, alerted: 0 };

    const nowBR       = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayBRT    = dateBRT(nowBR);
    const tomorrowBR  = new Date(nowBR);
    tomorrowBR.setDate(nowBR.getDate() + 1);
    const tomorrowBRT = dateBRT(tomorrowBR);

    const endingToday:    { account: string; campaign: string }[] = [];
    const endingTomorrow: { account: string; campaign: string }[] = [];

    for (const account of accounts) {
        try {
            const campaigns = await getCampaigns(account.account_id, 'today', workspaceId);
            for (const c of campaigns) {
                const endTime = (c as any).end_time;
                if (!endTime) continue;
                if (c.status !== 'ACTIVE') continue;
                const endDateBRT = dateBRT(new Date(endTime));
                if (endDateBRT === todayBRT) {
                    endingToday.push({ account: account.account_name, campaign: c.name });
                } else if (endDateBRT === tomorrowBRT) {
                    endingTomorrow.push({ account: account.account_name, campaign: c.name });
                }
            }
        } catch (err: any) {
            console.error(`[CampaignEndAlert] Error fetching campaigns for ${account.account_name}:`, err.message);
        }
    }

    const total = endingToday.length + endingTomorrow.length;
    if (total === 0) {
        console.log(`[CampaignEndAlert] Nenhuma campanha terminando hoje/amanhã (workspace ${workspaceId})`);
        return { checked: accounts.length, alerted: 0 };
    }

    let msg = `📅 *Alerta de Término de Campanhas*\n\n`;
    if (endingToday.length > 0) {
        msg += `🔴 *Terminam hoje (${todayBRT}):*\n`;
        for (const { account, campaign } of endingToday) {
            msg += `• ${account} — ${campaign}\n`;
        }
        msg += `\n`;
    }
    if (endingTomorrow.length > 0) {
        msg += `🟡 *Terminam amanhã (${tomorrowBRT}):*\n`;
        for (const { account, campaign } of endingTomorrow) {
            msg += `• ${account} — ${campaign}\n`;
        }
    }

    try {
        const result = await sendTextMessage(uazConfig, groupId, msg);
        if (result.success) {
            console.log(`[CampaignEndAlert] ${total} campanha(s) alertadas para workspace ${workspaceId}`);
            return { checked: accounts.length, alerted: total };
        }
        console.error(`[CampaignEndAlert] Falha no envio: ${result.error}`);
    } catch (err: any) {
        console.error(`[CampaignEndAlert] Erro ao enviar:`, err.message);
    }
    return { checked: accounts.length, alerted: 0 };
}

export async function checkAllCampaignEndAlerts(): Promise<{
    workspaces: number;
    totalAlerted: number;
}> {
    const settings = await prisma.setting.findMany({
        where: { balance_alert_group_id: { not: null } } as any,
        select: { workspace_id: true },
    });

    let totalAlerted = 0;
    for (const { workspace_id } of settings) {
        const result = await checkCampaignEndAlertsForWorkspace(workspace_id);
        totalAlerted += result.alerted;
    }
    return { workspaces: settings.length, totalAlerted };
}
