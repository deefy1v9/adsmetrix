import { NextResponse } from 'next/server';
import { fetchCampaignsAction } from '@/actions/meta-actions';

export async function GET() {
    try {
        const accountId = "act_8284259038302407"; // Leal Contabilidade
        console.log("Fetching yesterday campaigns for Leal...");

        const yesterdayCampaigns = await fetchCampaignsAction(accountId, 'yesterday');

        let spend = 0, leads = 0;
        yesterdayCampaigns.forEach((c: any) => {
            spend += parseFloat(c.insights?.spend || '0');
            leads += parseInt(c.insights?.leads || '0');
        });

        return NextResponse.json({
            status: "success",
            aggregated: { spend, leads },
            raw: yesterdayCampaigns
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
