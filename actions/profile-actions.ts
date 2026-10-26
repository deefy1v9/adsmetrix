"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function updateProfileNameAction(name: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada. Entre novamente." };
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 80) return { success: false, error: "O nome deve ter entre 2 e 80 caracteres." };

    await prisma.user.update({ where: { id: session.id }, data: { name: clean } });
    revalidatePath("/", "layout");
    return { success: true };
}

export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessão expirada. Entre novamente." };
    if (newPassword.length < 8) return { success: false, error: "A nova senha deve ter pelo menos 8 caracteres." };
    if (newPassword === currentPassword) return { success: false, error: "A nova senha deve ser diferente da atual." };

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { password: true } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return { success: false, error: "Senha atual incorreta." };
    }

    await prisma.user.update({ where: { id: session.id }, data: { password: await bcrypt.hash(newPassword, 12) } });
    return { success: true };
}
