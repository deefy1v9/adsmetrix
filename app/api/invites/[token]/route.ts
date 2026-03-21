import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite || invite.expires_at < new Date()) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/login?error=invite_invalido`
        );
    }

    return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    );
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const body = await request.json();
        const { name, password } = body;

        if (!name || !password) {
            return NextResponse.json({ error: "Nome e senha são obrigatórios." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
        }

        const invite = await prisma.invite.findUnique({ where: { token } });

        if (!invite || invite.expires_at < new Date()) {
            return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email: invite.email } });
        if (existing) {
            return NextResponse.json({ error: "Este e-mail já possui uma conta." }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email: invite.email,
                password: passwordHash,
                role: invite.role,
                workspace_id: invite.workspace_id,
            },
        });

        // Remove the consumed invite
        await prisma.invite.delete({ where: { token } });

        await createSession(user.id, user.role, user.workspace_id, false);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[Invite] Error:", err.message);
        return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
}
