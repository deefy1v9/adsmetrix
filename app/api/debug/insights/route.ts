import { NextResponse } from 'next/server';
import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret      = searchParams.get('secret');
    const accountId   = searchParams.get('account_id');   // ex: act_123456
    const datePreset  = searchParams.get('date_preset') ?? 'yesterday';

    const cronSecret = (process.env.CRON_SECRET || '').trim();
    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!accountId) {
        return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }

    try {
        // Get token
        const acc = await prisma.account.findFirst({
            where: { account_id: accountId.startsWith('act_') ? accountId : `act_${accountId}` },
            select: { access_token: true },
        });
        const workspace = await prisma.workspace.findFirst({ select: { meta_access_token: true } });
        const token = acc?.access_token || workspace?.meta_access_token || process.env.META_ACCESS_TOKEN || '';

        if (!token) return NextResponse.json({ error: 'No token found' }, { status: 500 });

        FacebookAdsApi.init(token);
        const account = new AdAccount(accountId);

        // Fetch campaign-level insights for first few campaigns
        const campaigns = await account.getCampaigns(['name', 'status'], { limit: 5 });
        const campaignInsights: any[] = [];
        for (const c of (campaigns as any[]).slice(0, 3)) {
            try {
                const ins = await c.getInsights(
                    ['impressions', 'spend', 'reach', 'actions', 'unique_actions'],
                    { date_preset: datePreset, action_attribution_windows: ['7d_click', '1d_view'] },
                );
                const raw = ins[0] ?? {};
                campaignInsights.push({
                    campaign: c.name,
                    reach: raw.reach,
                    spend: raw.spend,
                    actions: raw.actions ?? null,
                    unique_actions: raw.unique_actions ?? null,
                });
            } catch (e: any) {
                campaignInsights.push({ campaign: c.name, error: e.message });
            }
        }

        // Fetch account-level insights
        const accIns = await (account as any).getInsights(
            ['reach', 'actions', 'unique_actions'],
            { date_preset: datePreset, action_attribution_windows: ['7d_click', '1d_view'] },
        );
        const accRaw = accIns?.[0] ?? {};

        return NextResponse.json({
            account_id: accountId,
            date_preset: datePreset,
            account_level: {
                reach: accRaw.reach,
                actions: accRaw.actions ?? null,
                unique_actions: accRaw.unique_actions ?? null,
                all_keys: Object.keys(accRaw),
            },
            campaign_level_sample: campaignInsights,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
