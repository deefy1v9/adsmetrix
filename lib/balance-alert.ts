/**
 * Balance Alert System
 *
 * For each workspace:
 *   1. Fetch live account balances from Meta API
 *   2. Compare against per-account thresholds
 *   3. Send a WhatsApp message to the configured internal group when balance is low
 *   4. 4-hour cooldown per account to avoid spam
 *
 * Only prepaid accounts (is_prepay_account = true) are checked — postpaid accounts
 * are billed automatically via card and have no meaningful balance to alert on.
 */

import { prisma } from './prisma';
import { getAdAccounts } from './meta-api';
import { calculateAvailableBalance, getPaymentLabel } from './balance-utils';
import { sendTextMessage, UazAPIConfig } from './uazapi';

const COOLDOWN_HOURS = 4;

function buildAlertMessage(
    accountName: string,
    balance: number,
    threshold: number,
    paymentLabel: string,
    currency: string,
): string {
    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v);

    return (
        `⚠️ *Alerta de Saldo Baixo*\n\n` +
        `📊 *${accountName}*\n` +
        `💰 Saldo disponível: *${fmt(balance)}*\n` +
        `📱 Tipo: ${paymentLabel}\n` +
        `🔴 Limite configurado: ${fmt(threshold)}\n\n` +
        `_Recarregue o saldo para evitar pausa nas campanhas._`
    );
}

export async function checkBalanceAlertsForWorkspace(workspaceId: string): Promise<{
    checked: number;
    alerted: number;
    skipped: number;
}> {
    // 1. Load workspace setting (UazAPI config + alert group)
    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });

    if (
        !setting?.uazapi_url ||
        !setting?.uazapi_token ||
        !setting?.uazapi_instance ||
        !(setting as any).balance_alert_group_id
    ) {
        return { checked: 0, alerted: 0, skipped: 0 };
    }

    const uazConfig: UazAPIConfig = {
        baseUrl:  setting.uazapi_url.replace(/\/$/, ''),
        token:    setting.uazapi_token,
        instance: setting.uazapi_instance,
    };
    const groupId = (setting as any).balance_alert_group_id as string;

    // 2. Find accounts with alert enabled for this workspace
    const alertAccounts = await prisma.account.findMany({
        where: { workspace_id: workspaceId, balance_alert_enabled: true } as any,
    });
    if (!alertAccounts.length) return { checked: 0, alerted: 0, skipped: 0 };

    // 3. Fetch live balances from Meta API
    let metaAccounts;
    try {
        metaAccounts = await getAdAccounts(workspaceId);
    } catch (err: any) {
        console.error(`[BalanceAlert] Failed to fetch Meta accounts for workspace ${workspaceId}:`, err.message);
        return { checked: 0, alerted: 0, skipped: alertAccounts.length };
    }

    const now = new Date();
    let checked = 0, alerted = 0, skipped = 0;

    for (const dbAccount of alertAccounts) {
        checked++;

        // Match live account data
        const metaAccount = metaAccounts.find(
            a => a.account_id === dbAccount.account_id || a.id === dbAccount.account_id,
        );
        if (!metaAccount) { skipped++; continue; }

        // Only prepaid accounts have a meaningful balance
        if (!metaAccount.is_prepay_account) { skipped++; continue; }

        const balance   = calculateAvailableBalance(metaAccount);
        const threshold = (dbAccount as any).balance_alert_threshold as number ?? 200;
        const label     = getPaymentLabel(metaAccount);

        if (balance > threshold) {
            // Balance is fine — no alert needed
            skipped++;
            continue;
        }

        // Check 4-hour cooldown
        const lastSent = (dbAccount as any).balance_alert_last_sent_at as Date | null;
        if (lastSent) {
            const hoursSince = (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
            if (hoursSince < COOLDOWN_HOURS) {
                console.log(`[BalanceAlert] ${dbAccount.account_name} — cooldown active (${hoursSince.toFixed(1)}h ago). Skipping.`);
                skipped++;
                continue;
            }
        }

        // Send alert
        const message = buildAlertMessage(
            dbAccount.account_name,
            balance,
            threshold,
            label,
            dbAccount.currency || 'BRL',
        );

        try {
            const result = await sendTextMessage(uazConfig, groupId, message);
            if (result.success) {
                await prisma.account.update({
                    where: { id: dbAccount.id },
                    data:  { balance_alert_last_sent_at: now } as any,
                });
                console.log(`[BalanceAlert] Alert sent for ${dbAccount.account_name} — balance R$${balance.toFixed(2)}`);
                alerted++;
            } else {
                console.error(`[BalanceAlert] Failed to send for ${dbAccount.account_name}: ${result.error}`);
                skipped++;
            }
        } catch (err: any) {
            console.error(`[BalanceAlert] Error sending for ${dbAccount.account_name}:`, err.message);
            skipped++;
        }
    }

    return { checked, alerted, skipped };
}

/**
 * Runs balance alerts for ALL workspaces that have a group configured.
 */
export async function checkAllBalanceAlerts(): Promise<{
    workspaces: number;
    totalAlerted: number;
}> {
    // Find all settings that have a balance alert group configured
    const settings = await prisma.setting.findMany({
        where: { balance_alert_group_id: { not: null } } as any,
        select: { workspace_id: true },
    });

    let totalAlerted = 0;
    for (const { workspace_id } of settings) {
        const result = await checkBalanceAlertsForWorkspace(workspace_id);
        totalAlerted += result.alerted;
        if (result.checked > 0) {
            console.log(
                `[BalanceAlert] Workspace ${workspace_id} — checked: ${result.checked}, alerted: ${result.alerted}, skipped: ${result.skipped}`,
            );
        }
    }

    return { workspaces: settings.length, totalAlerted };
}
