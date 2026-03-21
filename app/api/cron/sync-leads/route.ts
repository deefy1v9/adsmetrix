import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLeadsFromAllManagedPages, syncLeadsFromMeta } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const startTime = Date.now();
    console.log('[Cron] Starting lead sync from Meta...');

    try {
        // 1. Global sync via managed pages
        const syncResult = await syncLeadsFromAllManagedPages();
        console.log(`[Cron] Global Meta Sync completed: ${syncResult.count} leads found/updated.`);

        // 2. Account-level sync
        const accounts = await prisma.account.findMany();

        let totalSynced = 0;
        for (const account of accounts) {
            try {
                const res = await syncLeadsFromMeta(account.account_id);
                if (res?.success) totalSynced += res.count || 0;
            } catch (err) {
                console.error(`[Cron] Failed to sync leads for account ${account.account_name}:`, err);
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        return NextResponse.json({
            success: true,
            syncCount: (syncResult.count ?? 0) + totalSynced,
            duration: `${duration}s`
        });

    } catch (error: any) {
        console.error('[Cron] Fatal error in sync-leads cron:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
