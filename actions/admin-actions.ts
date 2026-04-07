"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ADMIN_EMAIL = "deefy07@gmail.com";

async function assertAdmin() {
    const session = await getSession();
    if (!session || session.email !== ADMIN_EMAIL) {
        throw new Error("Acesso negado");
    }
}

export async function listAllUsersAction() {
    await assertAdmin();
    const users = await prisma.user.findMany({
        include: { workspace: { select: { id: true, nome_empresa: true, status: true } } },
        orderBy: { created_at: "desc" },
    });
    return users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        workspace_id: u.workspace_id,
        workspace_name: u.workspace?.nome_empresa ?? null,
        is_super_admin: u.is_super_admin,
        allowed_tabs: u.allowed_tabs ? JSON.parse(u.allowed_tabs) as string[] : null,
        allowed_account_ids: u.allowed_account_ids ? JSON.parse(u.allowed_account_ids) as string[] : null,
        created_at: u.created_at.toISOString(),
    }));
}

export async function deleteUserAction(userId: string) {
    await assertAdmin();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { workspace: { include: { users: { select: { id: true } } } } },
    });
    if (!user) return { success: false, error: "Usuário não encontrado" };

    // Delete workspace (cascades) when user is sole member; otherwise delete only user
    if (user.workspace && user.workspace.users.length === 1) {
        await prisma.workspace.delete({ where: { id: user.workspace.id } });
    } else {
        await prisma.user.delete({ where: { id: userId } });
    }

    return { success: true };
}

export async function updateUserPermissionsAction(
    userId: string,
    allowedTabs: string[] | null,
    allowedAccountIds: string[] | null,
) {
    await assertAdmin();

    await prisma.user.update({
        where: { id: userId },
        data: {
            allowed_tabs:        allowedTabs        ? JSON.stringify(allowedTabs)        : null,
            allowed_account_ids: allowedAccountIds  ? JSON.stringify(allowedAccountIds)  : null,
        },
    });

    return { success: true };
}

export async function listAllDbAccountsAction() {
    await assertAdmin();
    const accounts = await prisma.account.findMany({
        select: {
            id: true,
            account_id: true,
            account_name: true,
            client_name: true,
            workspace_id: true,
            workspace: { select: { nome_empresa: true } },
        },
        orderBy: { account_name: "asc" },
    });
    return accounts.map(a => ({
        id: a.id,
        account_id: a.account_id,
        name: a.client_name || a.account_name,
        workspace_name: a.workspace?.nome_empresa ?? null,
    }));
}
