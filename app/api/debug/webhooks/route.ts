import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const logs = await prisma.webhookLog.findMany({
            take: 20,
            orderBy: { receivedAt: 'desc' }
        });

        return NextResponse.json({
            count: logs.length,
            logs: logs.map(l => ({
                id: l.id,
                receivedAt: l.receivedAt,
                payload: JSON.parse(l.payload)
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
