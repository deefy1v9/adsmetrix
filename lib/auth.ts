import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "bilula_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const JWT_FALLBACK = 'bilula_secret_default_key_2024';
function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET || JWT_FALLBACK;
    if (!process.env.JWT_SECRET) console.warn("[Auth] JWT_SECRET not set — using insecure fallback. Set JWT_SECRET in production.");
    return new TextEncoder().encode(secret);
}

export async function authenticate(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    return user;
}

export async function createSession(userId: string, role: string, workspaceId: string | null, is_super_admin: boolean) {
    const token = await new SignJWT({
        userId,
        role,
        workspaceId,
        is_super_admin
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(getJwtSecret());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    });
}

export interface UserSession {
    id: string;
    email: string;
    name: string | null;
    role: string;
    workspace_id: string | null;
    is_super_admin: boolean;
}

export async function getSession(): Promise<UserSession | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie?.value) return null;

    try {
        const { payload } = await jwtVerify(sessionCookie.value, getJwtSecret());

        if (!payload.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: { id: true, email: true, name: true, role: true, workspace_id: true, is_super_admin: true }
        });

        return user as UserSession | null;
    } catch {
        return null;
    }
}

export async function destroySession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}
