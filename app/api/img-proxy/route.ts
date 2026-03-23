import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new NextResponse('Missing url', { status: 400 });

    const allowed = ['fbcdn.net', 'facebook.com', 'fbsbx.com', 'cdninstagram.com'];
    if (!allowed.some(d => url.includes(d))) {
        return new NextResponse('Domain not allowed', { status: 403 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Referer': 'https://www.facebook.com/',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            console.error(`[img-proxy] Failed ${response.status} for ${url.substring(0, 80)}`);
            return new NextResponse(`Upstream ${response.status}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        // Only serve actual image responses
        if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet')) {
            console.error(`[img-proxy] Non-image content-type: ${contentType} for ${url.substring(0, 80)}`);
            return new NextResponse('Not an image', { status: 400 });
        }

        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (e: any) {
        console.error(`[img-proxy] Error:`, e.message);
        return new NextResponse(`Proxy error`, { status: 500 });
    }
}
