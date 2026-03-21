import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const leads = await prisma.lead.findMany({
            where: { platform: 'custom_webhook' },
            orderBy: { created_time: 'desc' },
            take: 5
        });

        const rawPayloads = leads.map(l => ({
            id: l.id,
            name: l.full_name,
            raw_data: l.raw_data ? JSON.parse(l.raw_data) : null,
            created: l.created_time
        }));

        return NextResponse.json({ success: true, recent_webhooks: rawPayloads });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
