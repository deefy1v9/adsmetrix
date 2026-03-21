import { NextResponse } from 'next/server';

export async function GET() {
    // Force direct env check for debugging
    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

    console.log("[MetaAuth] Attempting login with AppID:", appId);

    if (!appId) {
        return NextResponse.json({
            error: "META_APP_ID not configured",
            message: "Por favor, reinicie o servidor (npm run dev) para carregar o novo .env",
            debug: {
                env_exists: !!process.env.META_APP_ID,
                app_url: process.env.NEXT_PUBLIC_APP_URL,
                keys: Object.keys(process.env).filter(k => k.includes('META'))
            }
        }, { status: 500 });
    }

    const scopes = [
        'public_profile',
        'ads_management',
        'leads_retrieval',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_manage_ads',
        'business_management'
    ].join(',');

    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

    return NextResponse.redirect(authUrl);
}
