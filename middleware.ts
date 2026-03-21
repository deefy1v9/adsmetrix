import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register", "/invite", "/api/auth/register", "/api/invites", "/api/webhooks", "/api/cron", "/favicon.svg", "/api/test-metrics", "/api/register", "/api/make-admin", "/home"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get("bilula_session");
    const tokenStr = sessionCookie?.value || request.headers.get('authorization')?.split(' ')[1];
    const adminSlug = process.env.ADMIN_SECRET_SLUG || '/admin-padrao-fallback';

    // 1. Ocultação da Rota Admin (Stealth Mode)
    if (pathname.startsWith(adminSlug)) {
        if (!tokenStr) {
            return NextResponse.rewrite(new URL('/404', request.url));
        }

        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'bilula_secret_default_key_2024');
            const { payload } = await jwtVerify(tokenStr, secret);

            // Se não for super admin, finge que a página não existe
            if (payload.is_super_admin !== true) {
                return NextResponse.rewrite(new URL('/404', request.url));
            }
        } catch (e) {
            return NextResponse.rewrite(new URL('/404', request.url));
        }
    }

    if (!tokenStr) {
        // Redireciona para login nas páginas, bloqueia nas APIs
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Acesso Negado: Não autenticado." }, { status: 401 });
        }
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'bilula_secret_default_key_2024');
        const { payload } = await jwtVerify(tokenStr, secret);

        // API Security Validation: Ensure User belongs to a Workspace or is a SuperAdmin
        if (pathname.startsWith("/api") && !payload.workspaceId && payload.is_super_admin !== true) {
            return NextResponse.json({ error: "Falha de Isolamento: Usuário sem Workspace vinculado." }, { status: 403 });
        }

        const requestHeaders = new Headers(request.headers);
        if (payload.workspaceId) {
            requestHeaders.set('x-workspace-id', payload.workspaceId as string);
        }
        if (payload.userId) {
            requestHeaders.set('x-user-id', payload.userId as string);
        }
        if (payload.role) {
            requestHeaders.set('x-user-role', payload.role as string);
        }
        if (payload.is_super_admin) {
            requestHeaders.set('x-super-admin', 'true');
        }

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (e) {
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 401 });
        }
        // Force relogin on bad token
        const res = NextResponse.redirect(new URL("/login", request.url));
        res.cookies.delete("bilula_session");
        return res;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
