import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TARGET_ACCOUNT_ID = '1894048377851867';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-admin-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find the account (try with and without act_ prefix)
        const account = await prisma.account.findFirst({
            where: {
                OR: [
                    { account_id: TARGET_ACCOUNT_ID },
                    { account_id: `act_${TARGET_ACCOUNT_ID}` },
                ],
            },
            select: { id: true, account_id: true, account_name: true, workspace_id: true },
        });

        if (!account) {
            return NextResponse.json({ error: 'Conta não encontrada', searched: TARGET_ACCOUNT_ID });
        }

        // Delete account (Cascade removes related campaigns, insights, etc.)
        await prisma.account.delete({ where: { id: account.id } });

        // Clean up ReportAutomation.account_ids JSON arrays that contain this account
        const automations = await prisma.reportAutomation.findMany({
            select: { id: true, account_ids: true },
        });

        let automationsUpdated = 0;
        for (const automation of automations) {
            const ids = automation.account_ids as string[];
            const filtered = ids.filter(
                id => id !== TARGET_ACCOUNT_ID && id !== `act_${TARGET_ACCOUNT_ID}`,
            );
            if (filtered.length !== ids.length) {
                await prisma.reportAutomation.update({
                    where: { id: automation.id },
                    data: { account_ids: filtered },
                });
                automationsUpdated++;
            }
        }

        return NextResponse.json({
            success: true,
            deleted: { id: account.id, account_id: account.account_id, name: account.account_name },
            automationsUpdated,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
