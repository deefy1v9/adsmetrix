import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, workspaceName } = body;

        if (!name || !email || !password || !workspaceName) {
            return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const { workspace, user } = await prisma.$transaction(async (tx) => {
            const workspace = await tx.workspace.create({
                data: {
                    nome_empresa: workspaceName,
                    status: "ACTIVE",
                },
            });

            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: passwordHash,
                    role: "Admin",
                    workspace_id: workspace.id,
                },
            });

            return { workspace, user };
        });

        await createSession(user.id, user.role, workspace.id, false);

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[Register] Error:", err.message);
        return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
}
