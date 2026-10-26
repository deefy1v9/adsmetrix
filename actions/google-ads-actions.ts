"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
    getGoogleAdsConfigStatus,
    getGoogleAdsCampaigns,
    getGoogleAdsDaily,
    getGoogleAdsSummary,
    getWorkspaceGoogleAccount,
    setGoogleAdsCampaignStatus,
    syncGoogleAdsAccounts,
    normalizeCustomerId,
    type GoogleAdsCampaignRow,
    type GoogleAdsDailyRow,
    type GoogleAdsMetrics,
} from "@/lib/google-ads";

async function requireWorkspaceId(): Promise<string> {
    const h = await headers();
    const workspaceId = h.get("x-workspace-id");
    if (!workspaceId) throw new Error("Sessão sem workspace vinculado.");
    return workspaceId;
}

export interface GoogleAdsAccountView {
    customer_id: string;
    name: string;
    currency: string;
    time_zone: string | null;
    via_manager: string | null;
    is_hidden: boolean;
}

export interface GoogleAdsStatus {
    config: ReturnType<typeof getGoogleAdsConfigStatus>;
    connected: boolean;
    email: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
    accounts: GoogleAdsAccountView[];
}

export async function getGoogleAdsStatusAction(): Promise<GoogleAdsStatus> {
    const config = getGoogleAdsConfigStatus();
    const h = await headers();
    const workspaceId = h.get("x-workspace-id");
    if (!workspaceId) return { config, connected: false, email: null, lastSyncedAt: null, lastError: null, accounts: [] };

    const [conn, accounts] = await Promise.all([
        prisma.googleAdsConnection.findUnique({
            where: { workspace_id: workspaceId },
            select: { google_email: true, last_synced_at: true, last_error: true },
        }),
        prisma.googleAdsAccount.findMany({ where: { workspace_id: workspaceId }, orderBy: { descriptive_name: "asc" } }),
    ]);

    return {
        config,
        connected: !!conn,
        email: conn?.google_email ?? null,
        lastSyncedAt: conn?.last_synced_at?.toISOString() ?? null,
        lastError: conn?.last_error ?? null,
        accounts: accounts.map(a => ({
            customer_id: a.customer_id,
            name: a.descriptive_name,
            currency: a.currency_code,
            time_zone: a.time_zone,
            via_manager: a.login_customer_id,
            is_hidden: a.is_hidden,
        })),
    };
}

export async function syncGoogleAdsAccountsAction(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const workspaceId = await requireWorkspaceId();
        const accounts = await syncGoogleAdsAccounts(workspaceId);
        revalidatePath("/google-ads");
        return { success: true, count: accounts.length };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function disconnectGoogleAdsAction(): Promise<{ success: boolean; error?: string }> {
    try {
        const workspaceId = await requireWorkspaceId();
        const conn = await prisma.googleAdsConnection.findUnique({ where: { workspace_id: workspaceId } });
        if (conn) {
            // Best effort: also revoke at Google so the grant disappears from the user's Google account
            try {
                const { decryptSecret } = await import("@/lib/crypto");
                await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptSecret(conn.refresh_token))}`, { method: "POST" });
            } catch { /* local removal is what matters */ }
        }
        await prisma.$transaction([
            prisma.googleAdsAccount.deleteMany({ where: { workspace_id: workspaceId } }),
            prisma.googleAdsConnection.deleteMany({ where: { workspace_id: workspaceId } }),
        ]);
        revalidatePath("/google-ads");
        revalidatePath("/settings");
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function setGoogleAdsAccountHiddenAction(customerId: string, hidden: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const workspaceId = await requireWorkspaceId();
        await prisma.googleAdsAccount.update({
            where: { workspace_id_customer_id: { workspace_id: workspaceId, customer_id: normalizeCustomerId(customerId) } },
            data: { is_hidden: hidden },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export interface GoogleAdsReport {
    summary: GoogleAdsMetrics;
    daily: GoogleAdsDailyRow[];
    campaigns: GoogleAdsCampaignRow[];
    currency: string;
}

export async function fetchGoogleAdsReportAction(
    customerId: string, startDate: string, endDate: string,
): Promise<{ data?: GoogleAdsReport; error?: string; code?: string }> {
    try {
        const workspaceId = await requireWorkspaceId();
        const account = await getWorkspaceGoogleAccount(workspaceId, customerId);
        const args = [workspaceId, account.customer_id, startDate, endDate, account.login_customer_id] as const;
        const [summary, daily, campaigns] = await Promise.all([
            getGoogleAdsSummary(...args),
            getGoogleAdsDaily(...args),
            getGoogleAdsCampaigns(...args),
        ]);
        return { data: { summary, daily, campaigns, currency: account.currency_code } };
    } catch (err: any) {
        return { error: err.message, code: err.code };
    }
}

export async function setGoogleAdsCampaignStatusAction(
    customerId: string, campaignId: string, status: "ENABLED" | "PAUSED",
): Promise<{ success: boolean; error?: string }> {
    try {
        if (status !== "ENABLED" && status !== "PAUSED") throw new Error("Status inválido.");
        const workspaceId = await requireWorkspaceId();
        const account = await getWorkspaceGoogleAccount(workspaceId, customerId);
        await setGoogleAdsCampaignStatus(workspaceId, account.customer_id, campaignId, status, account.login_customer_id);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
