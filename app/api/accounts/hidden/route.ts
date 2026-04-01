import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET(_req: NextRequest) {
    try {
        const h = await headers();
        const workspaceId = h.get('x-workspace-id') ?? undefined;

        const hidden = await prisma.account.findMany({
            where: workspaceId
                ? { workspace_id: workspaceId, is_hidden: true }
                : { is_hidden: true },
            select: { account_id: true, account_name: true },
        });

        return NextResponse.json(hidden);
    } catch (e: any) {
        return NextResponse.json([], { status: 500 });
    }
}
