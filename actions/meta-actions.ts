"use server";

import { getAdAccounts, getCampaigns, getAdSets, getAllLeads, getTopCreatives, getWeeklyBreakdown, updateObjectStatus, getAdsForAdSet, getAdsByCPR, invalidateAccountsCache, MetaAdAccount, MetaCampaign, MetaAdSet, MetaLead, MetaCreative, WeeklyDay } from "@/lib/meta-api";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getWorkspaceId(): Promise<string | undefined> {
    const h = await headers();
    return h.get("x-workspace-id") ?? undefined;
}

async function isSuperAdmin(): Promise<boolean> {
    const h = await headers();
    return h.get("x-super-admin") === "true";
}

async function getAllowedAccountIds(): Promise<string[] | null> {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return null;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { allowed_account_ids: true },
    });
    if (!user?.allowed_account_ids) return null;
    try { return JSON.parse(user.allowed_account_ids) as string[]; } catch { return null; }
}

export async function fetchAdAccountsAction(): Promise<MetaAdAccount[]> {
    const workspaceId = await getWorkspaceId();

    // Guard: workspace must have its own Meta token — check GlobalConfig as fallback for super-admins
    if (workspaceId) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { meta_access_token: true },
        });
        if (!workspace?.meta_access_token) {
            // Super-admin may have token in GlobalConfig (token predates workspace assignment)
            const superAdmin = await isSuperAdmin();
            if (superAdmin) {
                const globalConfig = await prisma.globalConfig.findUnique({
                    where: { id: 'singleton' },
                    select: { meta_access_token: true },
                });
                if (!globalConfig?.meta_access_token) {
                    // No token anywhere — return linked accounts from DB
                    try {
                        const linked = await prisma.account.findMany({ where: { workspace_id: workspaceId } });
                        return linked.map((a: any) => ({
                            id: a.account_id,
                            account_id: a.account_id,
                            name: a.account_name,
                            currency: a.currency,
                            account_status: a.account_status,
                            balance: a.balance,
                            amount_spent: a.amount_spent,
                            is_prepay_account: a.is_prepay,
                            ...a,
                        }));
                    } catch { return []; }
                }
                // Proceed with GlobalConfig token — workspaceId still scopes the upserts
            } else {
                // Regular user with no token — check if admin granted specific account access
                const allowedIds = await getAllowedAccountIds();
                if (allowedIds && allowedIds.length > 0) {
                    // Use GlobalConfig token to fetch accounts on behalf of this user
                    const globalConfig = await prisma.globalConfig.findUnique({
                        where: { id: 'singleton' },
                        select: { meta_access_token: true },
                    });
                    if (globalConfig?.meta_access_token) {
                        try {
                            // Fetch from Meta API using admin token (null workspaceId = use GlobalConfig)
                            const allAccounts = await getAdAccounts(undefined);
                            return allAccounts.filter(a =>
                                allowedIds.includes(a.id) || allowedIds.includes(a.account_id ?? "")
                            );
                        } catch { /* fall through to DB fallback */ }
                    }
                    // Fallback: return from DB filtered by allowed IDs
                    try {
                        const linked = await prisma.account.findMany({
                            where: { account_id: { in: allowedIds } },
                        });
                        return linked.map((a: any) => ({
                            id: a.account_id, account_id: a.account_id,
                            name: a.account_name, currency: a.currency,
                            account_status: a.account_status, balance: a.balance,
                            amount_spent: a.amount_spent, is_prepay_account: a.is_prepay,
                            ...a,
                        }));
                    } catch { return []; }
                }

                // No token and no allowed accounts — return accounts linked to this workspace (may be empty)
                try {
                    const linked = await prisma.account.findMany({ where: { workspace_id: workspaceId } });
                    return linked.map((a: any) => ({
                        id: a.account_id, account_id: a.account_id,
                        name: a.account_name, currency: a.currency,
                        account_status: a.account_status, balance: a.balance,
                        amount_spent: a.amount_spent, is_prepay_account: a.is_prepay,
                        ...a,
                    }));
                } catch { return []; }
            }
        }
    }

    const metaAccounts = await getAdAccounts(workspaceId);

    // CRITICAL: Upsert accounts into DB, but NEVER reassign accounts owned by another workspace
    for (const metaAcc of metaAccounts) {
        try {
            await prisma.account.upsert({
                where: { account_id: metaAcc.account_id },
                update: {
                    // Do NOT update workspace_id — the first workspace to claim an account keeps it
                    account_name: metaAcc.name,
                    currency: metaAcc.currency,
                    account_status: String(metaAcc.account_status || 'ACTIVE'),
                    balance: metaAcc.balance || 0,
                    amount_spent: metaAcc.amount_spent || 0,
                    is_prepay: metaAcc.is_prepay_account || false,
                },
                create: {
                    workspace_id: workspaceId ?? null,
                    account_id: metaAcc.account_id,
                    account_name: metaAcc.name,
                    currency: metaAcc.currency || 'BRL',
                    account_status: String(metaAcc.account_status || 'ACTIVE'),
                    balance: metaAcc.balance || 0,
                    amount_spent: metaAcc.amount_spent || 0,
                    is_prepay: metaAcc.is_prepay_account || false,
                }
            });
            // Claim unowned accounts for this workspace
            if (workspaceId) {
                await prisma.account.updateMany({
                    where: { account_id: metaAcc.account_id, workspace_id: null },
                    data: { workspace_id: workspaceId },
                });
            }
        } catch (e: any) {
            console.error(`[fetchAdAccountsAction] Failed to upsert account ${metaAcc.account_id}:`, e.message);
        }
    }

    // Fetch local account settings — no workspace filter, just match by account_id
    // (accounts may be owned by a different workspace in DB but the Meta token already
    //  ensures we only see accounts we're authorized for)
    let localAccounts: any[] = [];
    try {
        localAccounts = await prisma.account.findMany({
            where: {
                account_id: { in: metaAccounts.map(a => a.account_id) },
            }
        });
    } catch (e: any) {
        console.warn("[fetchAdAccountsAction] Failed to fetch local settings:", e.message);
    }

    // Return accounts from Meta API, excluding hidden ones
    return metaAccounts
        .filter(account => {
            const local = localAccounts.find((l: any) => l.account_id === account.account_id);
            return !local?.is_hidden;
        })
        .map(account => {
            const local = localAccounts.find((l: any) => l.account_id === account.account_id);
            return {
                ...account,
                daily_report_enabled: local?.daily_report_enabled || false,
                daily_report_time: local?.daily_report_time || "09:00",
                daily_report_range: local?.daily_report_range || "today",
                report_metrics_config: (local as any)?.report_metrics_config || null,
                report_custom_message: (local as any)?.report_custom_message || null,
                custom_webhook_id: local?.custom_webhook_id || null,
            };
        });
}

export async function toggleAccountHiddenAction(
    accountId: string,
    hidden: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        await prisma.account.update({
            where: { account_id: normalizedId },
            data: { is_hidden: hidden },
        });
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/accounts');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function generateCustomWebhookAction(accountId: string) {
    try {
        const { randomUUID } = require('crypto');
        const numericId = accountId.replace('act_', '');
        const prefixedId = `act_${numericId}`;
        const newWebhookId = randomUUID();

        await prisma.account.update({
            where: { account_id: prefixedId },
            data: { custom_webhook_id: newWebhookId }
        });

        revalidatePath('/leads');
        revalidatePath('/dashboard');

        return { success: true, webhookId: newWebhookId };
    } catch (e: any) {
        console.error("[generateCustomWebhookAction] Error:", e.message);
        return { success: false, error: "Erro ao gerar URL da Webhook" };
    }
}

export async function fetchCampaignsAction(accountId: string, datePreset: string = 'maximum'): Promise<MetaCampaign[]> {
    if (!accountId) return [];
    const workspaceId = await getWorkspaceId();
    return await getCampaigns(accountId, datePreset, workspaceId);
}

export async function fetchWeeklyBreakdownAction(accountId: string): Promise<WeeklyDay[]> {
    if (!accountId) return [];
    const workspaceId = await getWorkspaceId();
    return await getWeeklyBreakdown(accountId, workspaceId);
}

export async function fetchTopCreativesAction(accountId: string, datePreset: string = 'last_30d'): Promise<MetaCreative[]> {
    if (!accountId) return [];
    const workspaceId = await getWorkspaceId();
    return await getTopCreatives(accountId, datePreset, workspaceId);
}

export async function debugCreativesAction(accountId: string): Promise<any> {
    if (!accountId) return { error: 'No accountId' };
    try {
        const workspaceId = await getWorkspaceId();
        const { prisma } = await import('@/lib/prisma');
        let token = '';
        try {
            const account = await prisma.account.findUnique({
                where: { account_id: accountId.startsWith('act_') ? accountId : `act_${accountId}` },
                select: { access_token: true }
            });
            if (account?.access_token) token = account.access_token;
        } catch {}
        if (!token && workspaceId) {
            try {
                const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { meta_access_token: true } });
                if (workspace?.meta_access_token) token = workspace.meta_access_token;
            } catch {}
        }
        if (!token) {
            const gc = await prisma.globalConfig.findUnique({ where: { id: 'singleton' }, select: { meta_access_token: true } });
            if (gc?.meta_access_token) token = gc.meta_access_token;
        }
        if (!token) token = process.env.META_ACCESS_TOKEN || '';
        if (!token) return { error: 'No token found' };

        // Step 1: get first ad with insights + creative id
        const url = `https://graph.facebook.com/v19.0/${accountId}/ads?fields=name,creative,insights.date_preset(last_30d){impressions,spend}&limit=5&access_token=${token}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.error) return { step1Error: JSON.stringify(data.error) };

        const ad = (data.data || []).find((a: any) => a.insights?.data?.[0]);
        if (!ad) return { error: 'No ad with insights found', raw: data.data?.slice(0,3) };

        const creativeId = ad.creative?.id;
        if (!creativeId) return { error: 'No creative id on ad', ad };

        // Step 2: fetch creative object with all possible image fields
        const creativeUrl = `https://graph.facebook.com/v19.0/${creativeId}?fields=id,thumbnail_url,video_id,object_story_spec&access_token=${token}`;
        const creativeResp = await fetch(creativeUrl);
        const creativeData = await creativeResp.json();

        return {
            adName: ad.name,
            creativeId,
            creativeFields: creativeData
        };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function fetchLeadsAction(accountId: string, forceSync: boolean = false): Promise<MetaLead[]> {
    if (!accountId) return [];
    return await getAllLeads(accountId, forceSync);
}

export async function updateLeadStatusAction(leadId: string, status: string) {
    try {
        await prisma.lead.update({
            where: { lead_id: leadId },
            data: { status }
        });
        revalidatePath('/leads');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating lead status:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchAggregatedMetricsAction(accountId: string, datePreset: string = 'last_30d', explicitWorkspaceId?: string) {
    if (!accountId) return null;
    const workspaceId = explicitWorkspaceId || await getWorkspaceId();

    const [campaigns, accounts] = await Promise.all([
        getCampaigns(accountId, datePreset, workspaceId),
        getAdAccounts(workspaceId)
    ]);

    const account = accounts.find(a => a.id === accountId || a.id === `act_${accountId}`);

    // Aggregate metrics
    const totals = campaigns.reduce((acc, campaign) => {
        const insights = campaign.insights || {
            impressions: '0',
            clicks: '0',
            spend: '0',
            cpc: '0',
            ctr: '0',
            leads: '0',
            conversations: '0'
        };
        return {
            impressions: acc.impressions + parseFloat(insights.impressions || '0'),
            clicks: acc.clicks + parseFloat(insights.clicks || '0'),
            spend: acc.spend + parseFloat(insights.spend || '0'),
            cpc: insights.cpc || '0',
            ctr: insights.ctr || '0',
            cpm: '0',
            leads: acc.leads + parseFloat(insights.leads || '0'),
            conversations: acc.conversations + parseFloat(insights.conversations || '0'),
            reach: acc.reach + parseFloat(insights.reach || '0'),
            leads_gtm: acc.leads_gtm + parseFloat(insights.leads_gtm || '0'),
            leads_form: acc.leads_form + parseFloat(insights.leads_form || '0'),
            sales: acc.sales + parseFloat(insights.sales || '0'),
            page_likes: acc.page_likes + parseFloat(insights.page_likes || '0'),
            post_engagements: acc.post_engagements + parseFloat(insights.post_engagements || '0'),
            comments: acc.comments + parseFloat(insights.comments || '0'),
            video_views: acc.video_views + parseFloat(insights.video_views || '0'),
        };
    }, {
        impressions: 0,
        clicks: 0,
        spend: 0,
        cpc: '0',
        ctr: '0',
        cpm: '0',
        leads: 0,
        conversations: 0,
        reach: 0,
        leads_gtm: 0,
        leads_form: 0,
        sales: 0,
        page_likes: 0,
        post_engagements: 0,
        comments: 0,
        video_views: 0,
    });

    // Calculate weighted CTR and CPC from aggregated totals (not simple averages)
    totals.ctr = totals.impressions > 0
        ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
        : '0';
    totals.cpc = totals.clicks > 0
        ? (totals.spend / totals.clicks).toFixed(2)
        : '0';
    totals.cpm = totals.impressions > 0
        ? ((totals.spend / totals.impressions) * 1000).toFixed(2)
        : '0';

    return {
        ...totals,
        campaigns,
        accountInfo: account ? {
            is_prepay_account: account.is_prepay_account,
            balance: account.balance,
            spend_cap: account.spend_cap,
            amount_spent: account.amount_spent,
            funding_source_details: account.funding_source_details
        } : null
    };
}

export async function syncAllLeadsAction() {
    try {
        const { syncLeadsFromMeta, getAdAccounts, syncLeadsFromAllManagedPages } = require('@/lib/meta-api');

        // 1. Refresh Accounts and SYNC CAMPAIGNS first
        // This is critical so that Page-based sync can map leads to accounts via campaign_id
        console.log('[MetaActions] Refreshing accounts and campaigns before lead sync...');
        const { getCampaigns } = require('@/lib/meta-api');
        const workspaceId = await getWorkspaceId();
        const metaAccounts = await getAdAccounts(workspaceId);

        for (const metaAcc of metaAccounts) {
            const dbAcc = await prisma.account.upsert({
                where: { account_id: metaAcc.account_id },
                update: {
                    account_name: metaAcc.name,
                    currency: metaAcc.currency,
                    account_status: metaAcc.account_status,
                    balance: metaAcc.balance,
                    amount_spent: metaAcc.amount_spent,
                    is_prepay: metaAcc.is_prepay_account
                },
                create: {
                    workspace_id: workspaceId ?? null,
                    account_id: metaAcc.account_id,
                    account_name: metaAcc.name,
                    currency: metaAcc.currency,
                    account_status: metaAcc.account_status,
                    balance: metaAcc.balance,
                    amount_spent: metaAcc.amount_spent,
                    is_prepay: metaAcc.is_prepay_account
                }
            });

            // Sync campaigns for this account to populate DB for linkage
            try {
                const campaigns = await getCampaigns(dbAcc.account_id);
                for (const camp of campaigns) {
                    await prisma.campaign.upsert({
                        where: { campaign_id: camp.id },
                        update: {
                            campaign_name: camp.name,
                            impressions: parseInt(camp.insights?.impressions || '0'),
                            clicks: parseInt(camp.insights?.clicks || '0'),
                            spend: parseFloat(camp.insights?.spend || '0'),
                            ctr: parseFloat(camp.insights?.ctr || '0'),
                            date: new Date()
                        },
                        create: {
                            campaign_id: camp.id,
                            account_id: dbAcc.id,
                            campaign_name: camp.name,
                            impressions: parseInt(camp.insights?.impressions || '0'),
                            clicks: parseInt(camp.insights?.clicks || '0'),
                            spend: parseFloat(camp.insights?.spend || '0'),
                            ctr: parseFloat(camp.insights?.ctr || '0'),
                            date: new Date()
                        }
                    });
                }
            } catch (e: any) {
                console.error(`[MetaActions] Failed to sync campaigns for ${dbAcc.account_id}:`, e.message);
            }
        }

        // 2. Global Page-Based Sync (Ultimate Fallback)
        console.log('[MetaActions] Triggering page-based global sync...');
        const pageSyncRes = await syncLeadsFromAllManagedPages();

        // 3. Trigger account-based sync for each known account (scoped to workspace)
        const dbAccounts = await prisma.account.findMany({
            where: workspaceId ? { workspace_id: workspaceId } : {},
        });
        let total = pageSyncRes?.count || 0;
        let successCount = 0;

        for (const account of dbAccounts) {
            try {
                console.log(`[MetaActions] Syncing leads for account: ${account.account_name} (${account.account_id})`);
                const res = await syncLeadsFromMeta(account.account_id);
                if (res.success) {
                    total += res.count || 0;
                    successCount++;
                }
            } catch (err: any) {
                console.error(`Failed to sync account ${account.account_id}:`, err.message);
            }
        }

        revalidatePath('/leads');
        return {
            success: true,
            summary: `Sincronização concluída. ${successCount}/${dbAccounts.length} contas processadas. Total de leads (página + conta): ${total}.`
        };
    } catch (error: any) {
        console.error('Error in syncAllLeadsAction:', error);
        return { success: false, error: error.message };
    }
}

export async function retrySubscribeAction() {
    try {
        const { getAccessToken, subscribePageToLeads } = require('@/lib/meta-api');
        const workspaceId = await getWorkspaceId();
        const token = await getAccessToken(undefined, workspaceId);

        console.log("[Diagnostics] Manually retrying page subscriptions...");
        const results = await subscribePageToLeads(token);

        revalidatePath('/settings');
        return {
            success: true,
            results,
            message: "Inscrição de páginas processada. Verifique os logs para detalhes."
        };
    } catch (error: any) {
        console.error('[Diagnostics] Retry subscription failed:', error);
        return { success: false, error: error.message };
    }
}

export async function createManualLeadAction(accountId: string, data: { name: string, email: string, phone: string }) {
    try {
        // Find the internal account UUID first (it might be receiving act_xxxx or the UUID)
        const account = await prisma.account.findFirst({
            where: {
                OR: [
                    { id: accountId },
                    { account_id: accountId }
                ]
            }
        });

        if (!account) {
            return { success: false, error: "Conta não encontrada no banco de dados." };
        }

        const lead = await (prisma.lead as any).create({
            data: {
                account_id: account.id,
                lead_id: `manual_${Date.now()}`,
                full_name: data.name,
                email: data.email,
                phone: data.phone,
                platform: 'manual',
                created_time: new Date(),
                raw_data: JSON.stringify({
                    source: 'manual_entry',
                    ...data
                })
            }
        });

        revalidatePath('/leads');
        return { success: true, leadId: lead.id };
    } catch (e: any) {
        console.error("[createManualLeadAction] Error:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteLeadAction(leadId: string) {
    try {
        await prisma.lead.delete({
            where: { id: leadId }
        });
        revalidatePath('/leads');
        return { success: true };
    } catch (e: any) {
        console.error("[deleteLeadAction] Error:", e);
        return { success: false, error: "Erro ao deletar lead." };
    }
}

// ── Multi-Account Report Actions ──────────────────────────────────────────────

export interface AccountCampaignsResult {
    accountId: string;
    accountName: string;
    campaigns: MetaCampaign[];
}

export async function fetchCampaignsMultiAction(
    accountIds: string[],
    datePreset: string = 'last_30d'
): Promise<AccountCampaignsResult[]> {
    const workspaceId = await getWorkspaceId();

    const results = await Promise.all(
        accountIds.map(async (accountId) => {
            try {
                const [campaigns, dbAccount] = await Promise.all([
                    getCampaigns(accountId, datePreset, workspaceId),
                    prisma.account.findUnique({
                        where: { account_id: accountId.startsWith('act_') ? accountId : `act_${accountId}` },
                        select: { account_name: true },
                    }),
                ]);
                return { accountId, accountName: dbAccount?.account_name || accountId, campaigns };
            } catch (e: any) {
                console.error(`[fetchCampaignsMultiAction] Error for ${accountId}:`, e.message);
                return { accountId, accountName: accountId, campaigns: [] };
            }
        })
    );

    return results;
}

export async function fetchAdSetsForCampaignAction(
    accountId: string,
    campaignId: string,
    datePreset: string = 'last_30d'
): Promise<MetaAdSet[]> {
    const workspaceId = await getWorkspaceId();
    return getAdSets(accountId, campaignId, datePreset, workspaceId);
}

// ── Status Update Actions ──────────────────────────────────────────────────────

export async function updateCampaignStatusAction(
    accountId: string,
    campaignId: string,
    status: 'ACTIVE' | 'PAUSED'
): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    const result = await updateObjectStatus(campaignId, status, accountId, workspaceId);
    if (result.success) revalidatePath('/dashboard');
    return result;
}

export async function updateAdSetStatusAction(
    accountId: string,
    adSetId: string,
    status: 'ACTIVE' | 'PAUSED'
): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    const result = await updateObjectStatus(adSetId, status, accountId, workspaceId);
    if (result.success) revalidatePath('/dashboard');
    return result;
}

export async function updateAdStatusAction(
    accountId: string,
    adId: string,
    status: 'ACTIVE' | 'PAUSED'
): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    const result = await updateObjectStatus(adId, status, accountId, workspaceId);
    if (result.success) revalidatePath('/performance');
    return result;
}

// ── Performance Page Actions ───────────────────────────────────────────────────

export async function saveMaxCprAction(
    accountId: string,
    maxCpr: number | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        await (prisma.account as any).update({
            where: { account_id: normalizedId },
            data: { max_cpr: maxCpr },
        });
        revalidatePath('/performance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function fetchAdsForAdSetAction(
    accountId: string,
    adSetId: string,
    datePreset: string = 'last_30d'
): Promise<MetaCreative[]> {
    const workspaceId = await getWorkspaceId();
    return getAdsForAdSet(adSetId, datePreset, accountId, workspaceId);
}

export async function fetchAdsByCPRAction(
    accountId: string,
    datePreset: string = 'last_30d'
): Promise<MetaCreative[]> {
    const workspaceId = await getWorkspaceId();
    return getAdsByCPR(accountId, datePreset, workspaceId);
}

export interface AccountPerformance {
    accountId: string;
    accountName: string;
    maxCpr: number | null;
    totalSpend: number;
    totalConversations: number;
    avgCpr: number | null;
}

export async function fetchAllAccountsPerformanceAction(
    datePreset: string = 'last_30d'
): Promise<AccountPerformance[]> {
    const workspaceId = await getWorkspaceId();

    const accounts = await prisma.account.findMany({
        where: workspaceId ? { workspace_id: workspaceId, is_hidden: false } : { is_hidden: false },
        select: { account_id: true, account_name: true, max_cpr: true },
    });

    const results = await Promise.all(
        accounts.map(async (acc) => {
            try {
                const campaigns = await getCampaigns(acc.account_id, datePreset, workspaceId);
                let totalSpend = 0;
                let totalConversations = 0;
                for (const c of campaigns) {
                    totalSpend         += parseFloat(c.insights?.spend         || '0');
                    totalConversations += parseInt(c.insights?.conversations    || '0');
                }
                const avgCpr = totalConversations > 0 ? totalSpend / totalConversations : null;
                return {
                    accountId:          acc.account_id,
                    accountName:        acc.account_name,
                    maxCpr:             (acc as any).max_cpr ?? null,
                    totalSpend,
                    totalConversations,
                    avgCpr,
                } satisfies AccountPerformance;
            } catch {
                return {
                    accountId:          acc.account_id,
                    accountName:        acc.account_name,
                    maxCpr:             (acc as any).max_cpr ?? null,
                    totalSpend:         0,
                    totalConversations: 0,
                    avgCpr:             null,
                } satisfies AccountPerformance;
            }
        })
    );

    return results;
}

// ── Dashboard Metrics Config ──────────────────────────────────────────────────

import type { DashboardMetricKey } from '@/lib/dashboard-metrics-config';
import { DEFAULT_DASHBOARD_METRICS } from '@/lib/dashboard-metrics-config';

export async function getDashboardMetricsConfigAction(): Promise<Record<DashboardMetricKey, boolean>> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { ...DEFAULT_DASHBOARD_METRICS };

    const setting = await prisma.setting.findUnique({
        where:  { workspace_id: workspaceId },
        select: { dashboard_metrics_config: true },
    });

    const saved = setting?.dashboard_metrics_config as Record<string, boolean> | null;
    if (!saved) return { ...DEFAULT_DASHBOARD_METRICS };

    // Merge with defaults so new keys are always present
    return { ...DEFAULT_DASHBOARD_METRICS, ...saved } as Record<DashboardMetricKey, boolean>;
}

export async function saveDashboardMetricsConfigAction(config: Record<DashboardMetricKey, boolean>) {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Não autenticado' };

    try {
        await prisma.setting.upsert({
            where:  { workspace_id: workspaceId },
            update: { dashboard_metrics_config: config },
            create: { workspace_id: workspaceId, dashboard_metrics_config: config },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ *
 *  Token Meta — cadastro manual                                       *
 * ------------------------------------------------------------------ */

const GRAPH_VERSION = 'v20.0';

type TokenSource = 'workspace' | 'global' | 'env';

function maskToken(token: string): string {
    if (token.length <= 12) return '••••••••';
    return `${token.slice(0, 6)}••••${token.slice(-4)}`;
}

/** Reads the token that fetchAdAccountsAction would actually use, in the same precedence order. */
async function resolveCurrentToken(): Promise<{ token: string; source: TokenSource } | null> {
    const workspaceId = await getWorkspaceId();

    if (workspaceId) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { meta_access_token: true },
        });
        if (workspace?.meta_access_token) return { token: workspace.meta_access_token, source: 'workspace' };
    }

    const globalConfig = await prisma.globalConfig.findUnique({
        where: { id: 'singleton' },
        select: { meta_access_token: true },
    });
    if (globalConfig?.meta_access_token) return { token: globalConfig.meta_access_token, source: 'global' };

    if (process.env.META_ACCESS_TOKEN) return { token: process.env.META_ACCESS_TOKEN, source: 'env' };

    return null;
}

/**
 * Reads a token's real expiry via /debug_token.
 * `expiresAt === 0` means the token never expires (System User tokens).
 * Returns null when Meta refuses to describe the token — callers treat that as "unknown".
 */
async function getTokenExpiry(token: string): Promise<{ expiresAt: number; scopes: string[] } | null> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    // An app access token is the documented inspector; a token can also debug itself.
    const inspector = appId && appSecret ? `${appId}|${appSecret}` : token;

    try {
        const res = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(inspector)}`
        );
        const json = await res.json();
        if (json.error || !json.data) return null;
        return {
            expiresAt: typeof json.data.expires_at === 'number' ? json.data.expires_at : 0,
            scopes: Array.isArray(json.data.scopes) ? json.data.scopes : [],
        };
    } catch {
        return null;
    }
}

/** Validates a token against the Graph API, counts reachable ad accounts and reads its expiry. */
async function inspectToken(token: string): Promise<
    { valid: true; userName: string; accountsCount: number; expiresAt: number | null; scopes: string[] } |
    { valid: false; error: string }
> {
    try {
        const meRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(token)}`
        );
        const me = await meRes.json();
        if (me.error) return { valid: false, error: me.error.message ?? 'Token inválido' };

        const accRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=id&limit=500&summary=total_count&access_token=${encodeURIComponent(token)}`
        );
        const acc = await accRes.json();
        if (acc.error) {
            return {
                valid: false,
                error: `${acc.error.message ?? 'Erro ao listar contas'} — verifique se a permissão ads_read foi concedida.`,
            };
        }

        // summary.total_count is authoritative; fall back to the page length when Meta omits it
        const total = typeof acc.summary?.total_count === 'number'
            ? acc.summary.total_count
            : (acc.data?.length ?? 0);

        const debug = await getTokenExpiry(token);

        return {
            valid: true,
            userName: me.name ?? me.id ?? 'Desconhecido',
            accountsCount: total,
            expiresAt: debug ? debug.expiresAt : null,
            scopes: debug?.scopes ?? [],
        };
    } catch (err: any) {
        return { valid: false, error: err.message ?? 'Falha de rede ao contatar a Meta' };
    }
}

/**
 * Upgrades a short-lived token to a 60-day one.
 * Never touches a token that already never expires — exchanging a System User token
 * would trade a permanent credential for one that dies in 60 days.
 */
async function exchangeForLongLived(token: string, currentExpiresAt: number | null): Promise<{
    token: string;
    exchanged: boolean;
    expiresAt: number | null;
    reason?: string;
}> {
    if (currentExpiresAt === 0) {
        return { token, exchanged: false, expiresAt: 0, reason: 'permanent' };
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        return { token, exchanged: false, expiresAt: currentExpiresAt, reason: 'no_app_credentials' };
    }

    try {
        const res = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (data.error || !data.access_token) {
            return { token, exchanged: false, expiresAt: currentExpiresAt, reason: 'exchange_failed' };
        }

        // Keep the exchanged token only if it actually lives longer than what we already had
        const newExpiry = await getTokenExpiry(data.access_token);
        const newExpiresAt = newExpiry ? newExpiry.expiresAt : null;
        const improves =
            newExpiresAt === 0 ||
            currentExpiresAt === null ||
            (newExpiresAt !== null && newExpiresAt > currentExpiresAt);

        if (!improves) {
            return { token, exchanged: false, expiresAt: currentExpiresAt, reason: 'no_gain' };
        }
        return { token: data.access_token, exchanged: true, expiresAt: newExpiresAt };
    } catch {
        return { token, exchanged: false, expiresAt: currentExpiresAt, reason: 'exchange_failed' };
    }
}

export async function getMetaTokenStatusAction(): Promise<{
    hasToken: boolean;
    source: TokenSource | null;
    maskedToken: string | null;
    valid: boolean;
    userName?: string;
    accountsCount?: number;
    expiresAt?: number | null;
    overrideCount?: number;
    appCredentialsConfigured?: boolean;
    error?: string;
}> {
    const appCredentialsConfigured = !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

    try {
        const current = await resolveCurrentToken();
        if (!current) {
            return { hasToken: false, source: null, maskedToken: null, valid: false, appCredentialsConfigured };
        }

        // Per-account tokens win over the workspace token in getAccessToken() — surface them,
        // otherwise a stale one silently shadows the token just saved here.
        let overrideCount = 0;
        try {
            const workspaceId = await getWorkspaceId();
            if (workspaceId) {
                overrideCount = await prisma.account.count({
                    where: { workspace_id: workspaceId, NOT: { access_token: null } },
                });
            }
        } catch { /* diagnostic only */ }

        const check = await inspectToken(current.token);
        if (!check.valid) {
            return {
                hasToken: true,
                source: current.source,
                maskedToken: maskToken(current.token),
                valid: false,
                overrideCount,
                appCredentialsConfigured,
                error: check.error,
            };
        }

        return {
            hasToken: true,
            source: current.source,
            maskedToken: maskToken(current.token),
            valid: true,
            userName: check.userName,
            accountsCount: check.accountsCount,
            expiresAt: check.expiresAt,
            overrideCount,
            appCredentialsConfigured,
        };
    } catch (err: any) {
        return { hasToken: false, source: null, maskedToken: null, valid: false, appCredentialsConfigured, error: err.message };
    }
}

export async function saveMetaTokenAction(rawToken: string): Promise<{
    success: boolean;
    error?: string;
    userName?: string;
    accountsCount?: number;
    source?: TokenSource;
    longLived?: boolean;
    expiresAt?: number | null;
    warning?: string;
    clearedOverrides?: number;
}> {
    const token = (rawToken ?? '').trim();
    if (!token) return { success: false, error: 'Cole um token antes de salvar.' };

    const check = await inspectToken(token);
    if (!check.valid) return { success: false, error: check.error };

    if (check.accountsCount === 0) {
        return {
            success: false,
            error: 'O token é válido, mas não enxerga nenhuma conta de anúncio. Confirme se o usuário tem acesso às contas no Gerenciador de Negócios e se a permissão ads_read foi concedida.',
        };
    }

    const exchange = await exchangeForLongLived(token, check.expiresAt);
    const finalToken = exchange.token;
    const finalExpiresAt = exchange.expiresAt;

    // Tell the user up front when the token they saved is going to die on them —
    // this is the difference between "it worked" and "it stopped working tomorrow".
    let warning: string | undefined;
    if (finalExpiresAt === null) {
        warning = 'Não foi possível verificar a validade deste token na Meta. Se ele parar de funcionar em algumas horas, gere um token de Usuário do Sistema.';
    } else if (finalExpiresAt > 0) {
        const hoursLeft = Math.round((finalExpiresAt * 1000 - Date.now()) / 3_600_000);
        if (hoursLeft <= 24) {
            warning = `Atenção: este token expira em aproximadamente ${hoursLeft}h. ` +
                (exchange.reason === 'no_app_credentials'
                    ? 'Não foi possível estendê-lo porque META_APP_ID/META_APP_SECRET não estão configurados no servidor. '
                    : 'Não foi possível estendê-lo automaticamente. ') +
                'Use um token de Usuário do Sistema para que ele não expire.';
        }
    }

    try {
        const workspaceId = await getWorkspaceId();
        let source: TokenSource;
        let clearedOverrides = 0;

        if (workspaceId) {
            await prisma.workspace.update({
                where: { id: workspaceId },
                data: { meta_access_token: finalToken },
            });
            source = 'workspace';

            // getAccessToken() prefers Account.access_token over the workspace token, so a stale
            // per-account token would keep being used and look like "the new token didn't stick".
            try {
                const cleared = await prisma.account.updateMany({
                    where: { workspace_id: workspaceId, NOT: { access_token: null } },
                    data:  { access_token: null },
                });
                clearedOverrides = cleared.count;
            } catch (e: any) {
                console.warn('[saveMetaToken] Failed to clear per-account tokens:', e.message);
            }
        } else {
            await prisma.globalConfig.upsert({
                where:  { id: 'singleton' },
                update: { meta_access_token: finalToken },
                create: { id: 'singleton', meta_access_token: finalToken },
            });
            source = 'global';
        }

        invalidateAccountsCache();
        revalidatePath('/accounts');
        revalidatePath('/overview');
        revalidatePath('/settings');

        return {
            success: true,
            userName: check.userName,
            accountsCount: check.accountsCount,
            source,
            longLived: exchange.exchanged,
            expiresAt: finalExpiresAt,
            warning,
            clearedOverrides,
        };
    } catch (err: any) {
        return { success: false, error: err.message ?? 'Falha ao salvar o token.' };
    }
}
