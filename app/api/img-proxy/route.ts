import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new NextResponse('Missing url', { status: 400 });

    // Only proxy Meta/Facebook image domains
    const allowed = [
        'fbcdn.net',
        'facebook.com',
        'fbsbx.com',
        'cdninstagram.com',
    ];
    const isAllowed = allowed.some(d => url.includes(d));
    if (!isAllowed) return new NextResponse('Domain not allowed', { status: 403 });

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MetrixBot/1.0)',
                'Accept': 'image/*,*/*',
            },
            // follow redirects
            redirect: 'follow',
        });

        if (!response.ok) {
            return new NextResponse(`Upstream error ${response.status}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e: any) {
        return new NextResponse(`Proxy error: ${e.message}`, { status: 500 });
    }
}
