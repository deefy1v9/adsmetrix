import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const accs = await prisma.account.findMany();
        let deleted = 0;
        let deletedNames = [];

        for (const a of accs) {
            if (a.account_id.includes('-')) {
                console.log(`Deleting dummy account: ${a.account_name} (${a.account_id})`);
                await prisma.account.delete({ where: { id: a.id } });
                deleted++;
                deletedNames.push(a.account_name);
            }
        }

        return NextResponse.json({ success: true, deleted, deletedNames });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
