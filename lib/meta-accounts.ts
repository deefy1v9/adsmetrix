import { getAdAccounts, type MetaAdAccount } from "./meta-api";
import { prisma } from "./prisma";

export interface MetaAccountsContext {
    workspaceId: string | undefined;
    isSuperAdmin: boolean;
    /** Lazy: only the "no workspace token" branch needs it */
    getAllowedAccountIds: () => Promise<string[] | null>;
}

/**
 * Resolves which Meta ad accounts a caller can see. Shared by the dashboard
 * (fetchAdAccountsAction, context from request headers) and the MCP server (context from
 * the OAuth grant), so both apply the same workspace isolation and token fallbacks.
 */
export async function resolveMetaAccounts(ctx: MetaAccountsContext): Promise<MetaAdAccount[]> {
    const { workspaceId } = ctx;

    // Guard: workspace must have its own Meta token — check GlobalConfig as fallback for super-admins
    if (workspaceId) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { meta_access_token: true },
        });
        if (!workspace?.meta_access_token) {
            // Super-admin may have token in GlobalConfig (token predates workspace assignment)
            const superAdmin = ctx.isSuperAdmin;
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
                const allowedIds = await ctx.getAllowedAccountIds();
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
            console.error(`[resolveMetaAccounts] Failed to upsert account ${metaAcc.account_id}:`, e.message);
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
        console.warn("[resolveMetaAccounts] Failed to fetch local settings:", e.message);
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
