import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { invalidateAccountsCache } from '@/lib/meta-api';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${error}`);
    }

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_code`);
    }

    try {
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

        // 1. Exchange code for Short-lived User Access Token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange for Long-lived User Access Token (60 days)
        const longLivedRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
        );
        const longLivedData = await longLivedRes.json();

        const longLivedToken = longLivedData.access_token;
        const { subscribePageToLeads } = require('@/lib/meta-api');

        // 3. Store token in the current user's workspace (per-workspace isolation)
        invalidateAccountsCache();
        const session = await getSession();
        if (session?.workspace_id) {
            await prisma.workspace.update({
                where: { id: session.workspace_id },
                data: { meta_access_token: longLivedToken },
            });
        } else {
            // Fallback: persist to GlobalConfig for super-admins without a workspace
            await (prisma as any).globalConfig.upsert({
                where: { id: 'singleton' },
                update: { meta_access_token: longLivedToken },
                create: { id: 'singleton', meta_access_token: longLivedToken }
            });
        }

        // 4. Automatically subscribe pages to webhooks for real-time leads
        try {
            await subscribePageToLeads(longLivedToken);
            console.log("[MetaAuth] Automatic page subscription completed.");
        } catch (subErr: any) {
            console.error("[MetaAuth] Webhook subscription failed:", subErr.message);
            // We don't fail the whole login if subscription fails, but we log it
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?success=meta_connected`);

    } catch (err: any) {
        console.error("[MetaAuth] Error:", err.message);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(err.message)}`);
    }
}
