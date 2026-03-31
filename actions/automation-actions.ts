'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { MultiReportMetrics } from '@/lib/multi-report-builder';

async function getWorkspaceId(): Promise<string | null> {
    const h = await headers();
    return h.get('x-workspace-id');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CampaignSummary {
    id:        string;
    name:      string;
    accountId: string;
}

export interface AutomationFormData {
    name:             string;
    enabled:          boolean;
    account_ids:      string[];
    date_preset:      string;
    schedule_time:    string;
    metrics_config:   Record<string, boolean>;
    campaign_metrics: Record<string, Record<string, boolean>>;  // campaignId → per-campaign override
    custom_message:   string;
    skip_weekends:    boolean;
    totals_only:      boolean;
    destination_type: string;  // "default" | "number" | "group"
    destination_id:   string;  // phone or group JID
    destination_name: string;  // display label (group name)
}

export type AutomationRecord = {
    id:               string;
    workspace_id:     string;
    name:             string;
    enabled:          boolean;
    account_ids:      string[];
    date_preset:      string;
    schedule_time:    string;
    metrics_config:   Record<string, boolean>;
    campaign_metrics: Record<string, Record<string, boolean>>;
    custom_message:   string | null;
    skip_weekends:    boolean;
    totals_only:      boolean;
    destination_type: string;
    destination_id:   string | null;
    destination_name: string | null;
    last_sent_at:     Date | null;
    created_at:       Date;
    updated_at:       Date;
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listAutomationsAction(): Promise<AutomationRecord[]> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return [];

    const rows = await prisma.reportAutomation.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: 'desc' },
    });

    return rows.map(r => ({
        ...r,
        account_ids:      r.account_ids    as string[],
        metrics_config:   r.metrics_config as Record<string, boolean>,
        campaign_metrics: ((r as any).campaign_metrics ?? {}) as Record<string, Record<string, boolean>>,
        skip_weekends:    (r as any).skip_weekends ?? false,
        totals_only:      (r as any).totals_only   ?? false,
        destination_type: (r as any).destination_type ?? 'default',
        destination_id:   (r as any).destination_id   ?? null,
        destination_name: (r as any).destination_name ?? null,
    }));
}

export async function createAutomationAction(data: AutomationFormData) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        const row = await prisma.reportAutomation.create({
            data: {
                workspace_id:     workspaceId,
                name:             data.name.trim(),
                enabled:          data.enabled,
                account_ids:      data.account_ids,
                date_preset:      data.date_preset,
                schedule_time:    data.schedule_time,
                metrics_config:   data.metrics_config,
                campaign_metrics: data.campaign_metrics ?? {},
                custom_message:   data.custom_message.trim() || null,
                skip_weekends:    data.skip_weekends ?? false,
                totals_only:      data.totals_only   ?? false,
                destination_type: data.destination_type || 'default',
                destination_id:   data.destination_id.trim()   || null,
                destination_name: data.destination_name.trim() || null,
            } as any,
        });
        return { success: true, id: row.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateAutomationAction(id: string, data: AutomationFormData) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.reportAutomation.update({
            where:  { id, workspace_id: workspaceId },
            data: {
                name:             data.name.trim(),
                enabled:          data.enabled,
                account_ids:      data.account_ids,
                date_preset:      data.date_preset,
                schedule_time:    data.schedule_time,
                metrics_config:   data.metrics_config,
                campaign_metrics: data.campaign_metrics ?? {},
                custom_message:   data.custom_message.trim() || null,
                skip_weekends:    data.skip_weekends ?? false,
                totals_only:      data.totals_only   ?? false,
                destination_type: data.destination_type || 'default',
                destination_id:   data.destination_id.trim()   || null,
                destination_name: data.destination_name.trim() || null,
            } as any,
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteAutomationAction(id: string) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.reportAutomation.delete({ where: { id, workspace_id: workspaceId } });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function toggleAutomationAction(id: string, enabled: boolean) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.reportAutomation.update({
            where: { id, workspace_id: workspaceId },
            data:  { enabled },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Send ──────────────────────────────────────────────────────────────────────

// ── Preview ───────────────────────────────────────────────────────────────────

export async function previewAutomationAction(
    id: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const workspaceId = await getWorkspaceId();
        if (!workspaceId) return { success: false, error: 'Não autenticado' };

        const automation = await prisma.reportAutomation.findFirst({
            where: { id, workspace_id: workspaceId },
        });
        if (!automation) return { success: false, error: 'Automação não encontrada' };

        const accountIds     = automation.account_ids    as string[];
        const metricsConfig  = automation.metrics_config as MultiReportMetrics;
        const campaignMetrics = ((automation as any).campaign_metrics ?? {}) as Record<string, Record<string, boolean>>;
        const totalsOnly     = (automation as any).totals_only ?? false;

        const { getCampaigns, getAccountTotals } = await import('@/lib/meta-api');
        const accountsData = await Promise.all(
            accountIds.map(async (accountId) => {
                try {
                    const [campaigns, dbAccount, accountTotals] = await Promise.all([
                        getCampaigns(accountId, automation.date_preset, workspaceId),
                        prisma.account.findUnique({
                            where:  { account_id: accountId },
                            select: { account_name: true },
                        }),
                        getAccountTotals(accountId, automation.date_preset, workspaceId),
                    ]);
                    return { accountName: dbAccount?.account_name || accountId, campaigns, accountTotals };
                } catch {
                    return { accountName: accountId, campaigns: [] };
                }
            })
        );

        const { buildMultiAccountReport } = await import('@/lib/multi-report-builder');
        const message = buildMultiAccountReport(
            accountsData,
            metricsConfig,
            automation.date_preset,
            automation.custom_message ?? undefined,
            campaignMetrics,
            totalsOnly,
        );

        return { success: true, message };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ── Campaign list (for UI picker — no insights, fast) ─────────────────────────

export async function fetchCampaignListAction(accountIds: string[]): Promise<CampaignSummary[]> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId || accountIds.length === 0) return [];

    const { getCampaignNames } = await import('@/lib/meta-api');

    const results = await Promise.allSettled(
        accountIds.map(async (accountId) => {
            const campaigns = await getCampaignNames(accountId, workspaceId);
            return campaigns.map(c => ({ id: c.id, name: c.name, accountId }));
        })
    );

    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function runAutomationNowAction(id: string) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };
    return sendAutomationReport(id, workspaceId);
}

/**
 * Core send logic — used both by runAutomationNowAction and the cron job.
 */
export async function sendAutomationReport(automationId: string, workspaceId: string, isScheduled = false) {
    try {
        const automation = await prisma.reportAutomation.findFirst({
            where: { id: automationId, workspace_id: workspaceId },
        });
        if (!automation) return { success: false, error: 'Automação não encontrada' };

        // Never send disabled automations (defense-in-depth for scheduled runs)
        if (isScheduled && !automation.enabled) {
            return { success: true, skipped: true, reason: 'disabled' };
        }

        // Weekend / Monday logic — only for scheduled runs
        const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dayBR = nowBR.getDay(); // 0=Dom, 1=Seg, …, 6=Sáb
        const skipWeekends = !!(automation as any).skip_weekends;

        if (isScheduled && skipWeekends) {
            // Saturday (6) or Sunday (0) → skip
            if (dayBR === 0 || dayBR === 6) {
                return { success: true, skipped: true, reason: 'weekend' };
            }
        }

        // Monday rollup: on Monday, if skip_weekends is on and preset is 'yesterday',
        // pull Fri–Sun (last 3 complete days) so the weekend data is included.
        // After sending, nothing changes in the DB — Tuesday+ the preset goes back to 'yesterday' naturally.
        const isMonday = isScheduled && skipWeekends && dayBR === 1;
        const effectivePreset = isMonday && automation.date_preset === 'yesterday'
            ? 'last_3d_completed'
            : automation.date_preset;

        const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
        if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) {
            return { success: false, error: 'UazAPI não configurado' };
        }
        const destType = (automation as any).destination_type ?? 'default';
        const destId   = (automation as any).destination_id   ?? null;

        const destination = (destType !== 'default' && destId)
            ? destId
            : setting?.whatsapp_number;

        if (!destination) {
            return { success: false, error: 'Número destino não configurado' };
        }

        const accountIds    = automation.account_ids    as string[];
        const metricsConfig   = automation.metrics_config  as MultiReportMetrics;
        const campaignMetrics = ((automation as any).campaign_metrics ?? {}) as Record<string, Record<string, boolean>>;
        const totalsOnly      = (automation as any).totals_only ?? false;

        // Fetch campaigns and account-level totals (deduplicated reach/followers)
        const { getCampaigns, getAccountTotals } = await import('@/lib/meta-api');
        const accountsData = await Promise.all(
            accountIds.map(async (accountId) => {
                try {
                    const [campaigns, dbAccount, accountTotals] = await Promise.all([
                        getCampaigns(accountId, effectivePreset, workspaceId),
                        prisma.account.findUnique({
                            where:  { account_id: accountId },
                            select: { account_name: true },
                        }),
                        getAccountTotals(accountId, effectivePreset, workspaceId),
                    ]);
                    return { accountName: dbAccount?.account_name || accountId, campaigns, accountTotals };
                } catch {
                    return { accountName: accountId, campaigns: [] };
                }
            })
        );

        const { buildMultiAccountReport } = await import('@/lib/multi-report-builder');
        const message = buildMultiAccountReport(
            accountsData,
            metricsConfig,
            effectivePreset,
            automation.custom_message ?? undefined,
            campaignMetrics,
            totalsOnly,
        );

        const { sendTextMessage } = await import('@/lib/uazapi');
        const result = await sendTextMessage(
            {
                baseUrl:  setting.uazapi_url.replace(/\/$/, ''),
                token:    setting.uazapi_token,
                instance: setting.uazapi_instance,
            },
            destination,
            message,
        );

        if (!result.success) return { success: false, error: result.error };

        await prisma.reportAutomation.update({
            where: { id: automationId },
            data:  { last_sent_at: new Date() },
        });

        return { success: true };
    } catch (err: any) {
        console.error(`[Automation] sendAutomationReport error (${automationId}):`, err.message);
        return { success: false, error: err.message };
    }
}
