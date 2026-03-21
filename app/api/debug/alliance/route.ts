import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAggregatedMetricsAction } from "@/actions/meta-actions";

export async function GET() {
    try {
        const accounts = await prisma.account.findMany({
            where: {
                account_name: { contains: 'Alliance' }
            }
        });

        if (accounts.length === 0) {
            return NextResponse.json({ error: "No account found with name Alliance" });
        }

        const debugData = await Promise.all(accounts.map(async (acc) => {
            const yesterdayMetrics = await fetchAggregatedMetricsAction(acc.account_id, 'yesterday');
            const todayMetrics = await fetchAggregatedMetricsAction(acc.account_id, 'today');

            return {
                db_id: acc.id,
                meta_id: acc.account_id,
                name: acc.account_name,
                is_prepay: acc.is_prepay,
                metrics_yesterday: yesterdayMetrics,
                metrics_today: todayMetrics
            };
        }));

        return NextResponse.json(debugData);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
