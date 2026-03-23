"use server";

import { prisma } from "@/lib/prisma";
import { getAdAccounts, calculateAvailableBalance, getPaymentLabel, getAccountLeadsSummary } from "@/lib/meta-api";
import { endOfMonth, startOfMonth, eachDayOfInterval, format } from "date-fns";
import { headers } from "next/headers";

async function getWorkspaceId(): Promise<string | undefined> {
    const h = await headers();
    return h.get("x-workspace-id") ?? undefined;
}

async function isSuperAdmin(): Promise<boolean> {
    const h = await headers();
    return h.get("x-super-admin") === "true";
}

async function workspaceHasToken(workspaceId: string): Promise<boolean> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { meta_access_token: true },
    });
    if (workspace?.meta_access_token) return true;
    // Super-admin fallback: check GlobalConfig
    const superAdmin = await isSuperAdmin();
    if (superAdmin) {
        const globalConfig = await prisma.globalConfig.findUnique({
            where: { id: 'singleton' },
            select: { meta_access_token: true },
        });
        return !!globalConfig?.meta_access_token;
    }
    return false;
}

export async function fetchGeneralOverviewAction() {
    try {
        const workspaceId = await getWorkspaceId();

        // Guard: workspace sem token não deve ver dados do Meta
        if (workspaceId) {
            const hasToken = await workspaceHasToken(workspaceId);
            if (!hasToken) {
                return [];
            }
        }

        const metaAccounts = await getAdAccounts(workspaceId);

        // Fetch local accounts scoped to this workspace
        let localAccounts: any[] = [];
        try {
            localAccounts = await prisma.account.findMany({
                where: workspaceId ? { workspace_id: workspaceId } : {},
            });
        } catch (e: any) {
            console.warn("[fetchGeneralOverviewAction] Failed to fetch local accounts:", e.message);
        }

        const overviewData = await Promise.all(metaAccounts.map(async (metaAcc) => {
            const relevantLocals = localAccounts.filter(l => l.account_id === metaAcc.account_id || l.account_id === metaAcc.id);
            const isHidden = relevantLocals.some(l => (l as any).is_hidden);

            // Skip hidden accounts
            if (isHidden) return null;

            const local = relevantLocals[0];

            // Leads (form + messaging/conversations) from Meta API
            let leads24h = 0;
            let leadsMonth = 0;
            try {
                const summary = await getAccountLeadsSummary(metaAcc.account_id || metaAcc.id, workspaceId);
                leads24h = summary.leads24h;
                leadsMonth = summary.leadsMonth;
            } catch (e: any) {
                console.warn(`[fetchGeneralOverviewAction] Failed to fetch leads for ${metaAcc.account_id}:`, e.message);
            }

            const isPrepay = metaAcc.is_prepay_account;
            const paymentLabel = getPaymentLabel(metaAcc);

            return {
                id: metaAcc.id,
                name: metaAcc.name,
                client_name: local?.client_name || metaAcc.name,
                balance: calculateAvailableBalance(metaAcc),
                amount_spent: metaAcc.amount_spent || 0,
                currency: metaAcc.currency || "BRL",
                leads24h,
                leadsMonth,
                lastCharge: isPrepay ? (metaAcc.funding_source_details?.display_string || "N/A") : paymentLabel,
                is_prepay: isPrepay,
                spend_cap: metaAcc.spend_cap || 0
            };
        }));

        // Filter out nulls (hidden accounts) and sort by balance
        return overviewData
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => {
                // Accounts with balance > 0 first
                if (a.balance > 0 && b.balance <= 0) return -1;
                if (a.balance <= 0 && b.balance > 0) return 1;
                // Then by balance amount descending
                return b.balance - a.balance;
            });
    } catch (error) {
        console.error("Error fetching general overview:", error);
        throw error;
    }
}

export async function fetchMonthlyCalendarAction(year: number, month: number) {
    try {
        const workspaceId = await getWorkspaceId();

        // Guard: workspace sem token não deve ver dados do Meta
        if (workspaceId) {
            const hasToken = await workspaceHasToken(workspaceId);
            if (!hasToken) {
                return { year, month, daysInMonth: new Date(year, month + 1, 0).getDate(), accounts: [] };
            }
        }

        const startDate = new Date(year, month, 1);
        const endDate = endOfMonth(startDate);

        const metaAccounts = await getAdAccounts(workspaceId);

        let localAccounts: any[] = [];
        let leads: any[] = [];

        try {
            // Filter out Meta test leads
            const testLeadFilter = {
                raw_data: {
                    not: {
                        contains: '"is_dummy":true'
                    }
                }
            };

            localAccounts = await prisma.account.findMany({
                where: workspaceId ? { workspace_id: workspaceId } : {},
            });
            leads = await prisma.lead.findMany({
                where: {
                    ...testLeadFilter,
                    created_time: { gte: startDate, lte: endDate },
                    ...(workspaceId ? {
                        account: { workspace_id: workspaceId }
                    } : {}),
                },
                select: {
                    created_time: true,
                    account: {
                        select: {
                            account_name: true,
                            account_id: true
                        }
                    }
                }
            });
        } catch (e: any) {
            console.warn("[fetchMonthlyCalendarAction] Database queries failed:", e.message);
        }

        // Group leads by account and then by day
        const accountsMap: Record<string, { name: string, days: Record<number, number> }> = {};

        // Initialize with all known meta accounts, filtering hidden ones
        metaAccounts.forEach(acc => {
            const relevantLocals = localAccounts.filter(l => l.account_id === acc.id || l.account_id === acc.account_id);
            const isHidden = relevantLocals.some(l => (l as any).is_hidden);

            if (isHidden) return;

            accountsMap[acc.id] = {
                name: acc.name,
                days: {}
            };
        });

        leads.forEach(lead => {
            if (!lead.account) return;
            const accId = lead.account.account_id;
            const relevantLocals = localAccounts.filter(l => l.account_id === accId || l.account_id === `act_${accId.replace('act_', '')}`);
            const isHidden = relevantLocals.some(l => (l as any).is_hidden);

            if (isHidden) return;

            const day = lead.created_time.getDate();

            if (accountsMap[accId]) {
                accountsMap[accId].days[day] = (accountsMap[accId].days[day] || 0) + 1;
            } else {
                // Fallback for accounts not in Meta list (maybe deleted from Meta but we have leads)
                // We only show it if it's NOT hidden (though if it's not in meta list it doesn't have a local config to be hidden)
                accountsMap[accId] = {
                    name: lead.account.account_name,
                    days: {}
                };
                accountsMap[accId].days[day] = 1;
            }
        });

        // Convert map to array and sort by total leads
        const sortedAccounts = Object.entries(accountsMap).map(([id, data]) => {
            const totalLeads = Object.values(data.days).reduce((sum, count) => sum + count, 0);
            return {
                id,
                name: data.name,
                days: data.days,
                totalLeads
            };
        }).sort((a, b) => b.totalLeads - a.totalLeads);

        return {
            year,
            month,
            daysInMonth: endDate.getDate(),
            accounts: sortedAccounts.map(({ totalLeads, ...acc }) => acc)
        };
    } catch (error) {
        console.error("Error fetching monthly calendar:", error);
        throw error;
    }
}

export async function toggleAccountVisibilityAction(accountId: string, isHidden: boolean) {
    try {
        const numericId = accountId.replace('act_', '');
        const prefixedId = `act_${numericId}`;

        // Update all possible variations to keep them in sync
        const result = await prisma.account.updateMany({
            where: {
                OR: [
                    { account_id: numericId },
                    { account_id: prefixedId }
                ]
            },
            data: { is_hidden: isHidden } as any
        });

        // If no records were updated, it might be a new account we haven't seen yet
        if (result.count === 0) {
            const workspaceId = await getWorkspaceId();
            const metaAccounts = await getAdAccounts(workspaceId);
            const meta = metaAccounts.find(a => a.id === prefixedId || a.id === numericId || a.account_id === numericId);

            if (meta) {
                await prisma.account.create({
                    data: {
                        account_id: prefixedId, // Standardize on prefixed ID for new ones
                        account_name: meta.name,
                        is_hidden: isHidden
                    } as any
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error toggling account visibility:", error);
        return { success: false, error: (error as any).message };
    }
}

export async function bulkToggleAccountVisibilityAction(accountIds: string[], isHidden: boolean) {
    try {
        const numericIds = accountIds.map(id => id.replace('act_', ''));
        const prefixedIds = numericIds.map(id => `act_${id}`);

        // We process them one by one to use the same safety checks as single toggle
        // including the auto-creation of missing local records logic
        for (const id of accountIds) {
            await toggleAccountVisibilityAction(id, isHidden);
        }

        return { success: true };
    } catch (error) {
        console.error("Error in bulk account visibility toggle:", error);
        return { success: false, error: (error as any).message };
    }
}

export async function updateAccountAction(accountId: string, data: { client_name?: string }) {
    try {
        let local = await prisma.account.findFirst({
            where: {
                OR: [
                    { account_id: accountId },
                    { account_id: accountId.replace('act_', '') }
                ]
            }
        });

        if (!local) {
            const workspaceId = await getWorkspaceId();
            const metaAccounts = await getAdAccounts(workspaceId);
            const meta = metaAccounts.find(a => a.id === accountId);
            if (!meta) throw new Error("Account not found in Meta");

            local = await prisma.account.create({
                data: {
                    account_id: meta.account_id,
                    account_name: meta.name,
                    client_name: data.client_name
                }
            });
        } else {
            await prisma.account.update({
                where: { id: local.id },
                data: { client_name: data.client_name }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating account:", error);
        return { success: false, error: (error as any).message };
    }
}
