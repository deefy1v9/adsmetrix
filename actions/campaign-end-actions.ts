'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function getWorkspaceId(): Promise<string | null> {
    const h = await headers();
    return h.get('x-workspace-id');
}

async function getMetaToken(workspaceId: string): Promise<string | null> {
    const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { meta_access_token: true },
    });
    if (ws?.meta_access_token) return ws.meta_access_token;
    const gc = await prisma.globalConfig.findUnique({
        where: { id: 'singleton' },
        select: { meta_access_token: true },
    });
    return gc?.meta_access_token ?? process.env.META_ACCESS_TOKEN ?? null;
}

export interface CampaignWithEndDate {
    accountId:    string;
    accountName:  string;
    campaignId:   string;
    campaignName: string;
    status:       string;
    stopTime:     string;  // ISO string
}

export async function listActiveCampaignsWithEndDateAction(): Promise<{
    success: boolean;
    campaigns: CampaignWithEndDate[];
    error?: string;
}> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, campaigns: [], error: 'Não autenticado' };

    try {
        const token = await getMetaToken(workspaceId);
        if (!token) return { success: false, campaigns: [], error: 'Token Meta não configurado' };

        const accounts = await prisma.account.findMany({
            where: { workspace_id: workspaceId, is_hidden: false } as any,
            select: { account_id: true, account_name: true },
        });

        // Cutoff: only include campaigns ending within the last 7 days or in the future
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);

        const fields = 'id,name,status,stop_time';
        const results = await Promise.all(
            accounts.map(async (account) => {
                const out: CampaignWithEndDate[] = [];
                let url: string | null = `https://graph.facebook.com/v20.0/${account.account_id}/campaigns?fields=${fields}&limit=200&access_token=${token}`;
                while (url) {
                    try {
                        const res: any = await fetch(url);
                        const data: any = await res.json();
                        if (data.error) break;
                        for (const c of data.data || []) {
                            if (c.status !== 'ACTIVE') continue;
                            if (!c.stop_time) continue;
                            if (new Date(c.stop_time) < cutoff) continue;
                            out.push({
                                accountId:    account.account_id,
                                accountName:  account.account_name,
                                campaignId:   c.id,
                                campaignName: c.name,
                                status:       c.status,
                                stopTime:     c.stop_time,
                            });
                        }
                        url = data.paging?.next ?? null;
                    } catch {
                        break;
                    }
                }
                return out;
            }),
        );

        const campaigns = results.flat().sort(
            (a, b) => new Date(a.stopTime).getTime() - new Date(b.stopTime).getTime(),
        );

        return { success: true, campaigns };
    } catch (err: any) {
        return { success: false, campaigns: [], error: err.message };
    }
}
