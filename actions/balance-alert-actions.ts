'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { checkBalanceAlertsForWorkspace } from '@/lib/balance-alert';

async function getWorkspaceId(): Promise<string | null> {
    const h = await headers();
    return h.get('x-workspace-id');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AccountAlertConfig {
    accountId:       string;  // Meta platform ID (act_xxx)
    accountName:     string;
    isPrepay:        boolean;
    paymentLabel:    string;
    currency:        string;
    alertEnabled:    boolean;
    alertThreshold:  number;
    alertLastSentAt: string | null;  // ISO string
}

export interface BalanceAlertSettings {
    accounts:   AccountAlertConfig[];
    groupId:    string | null;
    groupName:  string | null;
    alertTime:  string;
}

// ── Read settings ─────────────────────────────────────────────────────────────

/**
 * Returns all accounts for the workspace with their alert config,
 * plus the configured WhatsApp group destination for alerts.
 *
 * Balance type detection requires the live Meta account data which comes
 * from the `fetchAdAccountsAction` call in the frontend (to avoid
 * loading the Meta API on every settings page render).
 */
export async function getBalanceAlertSettingsAction(): Promise<BalanceAlertSettings | null> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return null;

    const [dbAccounts, setting] = await Promise.all([
        prisma.account.findMany({
            where: { workspace_id: workspaceId, is_hidden: false },
            select: {
                account_id:    true,
                account_name:  true,
                is_prepay:     true,
                currency:      true,
            } as any,
            orderBy: { account_name: 'asc' },
        }),
        prisma.setting.findUnique({
            where:  { workspace_id: workspaceId },
            select: {
                balance_alert_group_id:   true,
                balance_alert_group_name: true,
                balance_alert_time:       true,
            } as any,
        }),
    ]);

    // Fetch alert-specific fields separately (new columns, may need any cast)
    const alertFields = await prisma.account.findMany({
        where: { workspace_id: workspaceId, is_hidden: false },
        select: {
            account_id:                true,
            balance_alert_enabled:     true,
            balance_alert_threshold:   true,
            balance_alert_last_sent_at: true,
        } as any,
    });
    const alertMap = new Map<string, any>(
        alertFields.map((a: any) => [a.account_id, a]),
    );

    const accounts: AccountAlertConfig[] = (dbAccounts as any[]).map(a => {
        const alert = alertMap.get(a.account_id) ?? {};
        return {
            accountId:       a.account_id,
            accountName:     a.account_name,
            isPrepay:        a.is_prepay ?? false,
            paymentLabel:    a.is_prepay ? 'Pré-pago' : 'Cobrança automática',
            currency:        a.currency ?? 'BRL',
            alertEnabled:    alert.balance_alert_enabled    ?? false,
            alertThreshold:  alert.balance_alert_threshold  ?? 200,
            alertLastSentAt: alert.balance_alert_last_sent_at
                ? new Date(alert.balance_alert_last_sent_at).toISOString()
                : null,
        };
    });

    return {
        accounts,
        groupId:   (setting as any)?.balance_alert_group_id   ?? null,
        groupName: (setting as any)?.balance_alert_group_name ?? null,
        alertTime: (setting as any)?.balance_alert_time       ?? '09:00',
    };
}

// ── Save per-account alert config ─────────────────────────────────────────────

export async function saveAccountAlertAction(
    metaAccountId: string,
    enabled:   boolean,
    threshold: number,
) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        const canonicalId = metaAccountId.startsWith('act_') ? metaAccountId : `act_${metaAccountId}`;
        await prisma.account.updateMany({
            where: { account_id: canonicalId, workspace_id: workspaceId },
            data:  {
                balance_alert_enabled:   enabled,
                balance_alert_threshold: threshold,
            } as any,
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Save alert group ──────────────────────────────────────────────────────────

export async function saveBalanceAlertGroupAction(
    groupId:   string | null,
    groupName: string | null,
    alertTime: string,
) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.setting.upsert({
            where:  { workspace_id: workspaceId },
            update: {
                balance_alert_group_id:   groupId,
                balance_alert_group_name: groupName,
                balance_alert_time:       alertTime,
            } as any,
            create: {
                workspace_id:             workspaceId,
                balance_alert_group_id:   groupId,
                balance_alert_group_name: groupName,
                balance_alert_time:       alertTime,
            } as any,
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Manual check ─────────────────────────────────────────────────────────────

/**
 * Triggers an immediate balance check for the current workspace.
 * Used by the "Verificar Agora" button in the UI.
 */
export async function runBalanceCheckNowAction(): Promise<{
    success: boolean;
    alerted: number;
    checked: number;
    error?: string;
}> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, alerted: 0, checked: 0, error: 'Não autenticado' };

    try {
        const result = await checkBalanceAlertsForWorkspace(workspaceId);
        return { success: true, ...result };
    } catch (err: any) {
        return { success: false, alerted: 0, checked: 0, error: err.message };
    }
}
