import { NextResponse } from 'next/server';
import { checkAllBalanceAlerts } from '@/lib/balance-alert';

/**
 * Balance Check Cron Job
 *
 * Runs every hour (configure in VPS crontab or Vercel cron.json).
 * Checks all enabled accounts across all workspaces and sends WhatsApp
 * alerts to the configured internal group when balance is below the threshold.
 *
 * Call: GET /api/cron/balance-check?token=CRON_SECRET
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');

    const rawSecret  = process.env.CRON_SECRET || '';
    const cronSecret = rawSecret.trim().replace(/^["']|["']$/g, '');

    const isAuthenticated =
        (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
        (cronSecret && queryToken === cronSecret);

    if (cronSecret && !isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await checkAllBalanceAlerts();

        return NextResponse.json({
            timestamp:     new Date().toISOString(),
            workspaces:    result.workspaces,
            totalAlerted:  result.totalAlerted,
        });
    } catch (error) {
        console.error('[Cron] balance-check error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
