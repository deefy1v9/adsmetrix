import { NextResponse } from 'next/server';
import { sendAllDailyReportsAction } from '@/actions/report-actions';

/**
 * Daily Reports Cron Job
 * 
 * Configured to run daily via Vercel Cron.
 * Iterates through all Ad Accounts linked to a Júpiter Ticket and sends the daily report.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');

    // Sanitize secret: trim and remove potential quotes
    const rawSecret = process.env.CRON_SECRET || "";
    const cronSecret = rawSecret.trim().replace(/^["']|["']$/g, "");

    const isAuthenticated =
        (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
        (cronSecret && queryToken === cronSecret);

    if (cronSecret && !isAuthenticated) {
        return NextResponse.json(
            {
                error: 'Unauthorized',
                message: 'Chave de seguranca incorreta. Verifique o CRON_SECRET no seu arquivo .env da VPS.'
            },
            { status: 401 }
        );
    }

    try {
        const result = await sendAllDailyReportsAction('wa');

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            ...result
        });

    } catch (error) {
        console.error('Error in daily reports cron:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
