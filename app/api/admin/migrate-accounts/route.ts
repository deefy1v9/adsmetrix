import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * POST /api/admin/migrate-accounts
 * One-time migration: create a workspace for a legacy user (no workspace_id)
 * and assign all orphaned accounts (workspace_id = null) to it.
 *
 * Protected: requires CRON_SECRET header (server-to-server call)
 *
 * Body: { email: string, workspaceName?: string }
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow via CRON_SECRET or internal header set by middleware for super-admins
    const h = await headers();
    const isSuperAdmin = h.get("x-super-admin") === "true";
    const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isSuperAdmin && !hasSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, workspaceName } = await request.json();
    if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user already has a workspace, migrate orphaned accounts and token if needed
    if (user.workspace_id) {
        const [result, existingWs, globalConfig] = await Promise.all([
            prisma.account.updateMany({
                where: { workspace_id: null },
                data: { workspace_id: user.workspace_id },
            }),
            (prisma.workspace as any).findUnique({ where: { id: user.workspace_id }, select: { meta_access_token: true } }),
            (prisma as any).globalConfig.findUnique({ where: { id: 'singleton' }, select: { meta_access_token: true } }),
        ]);

        // Copy GlobalConfig token to workspace if workspace has none
        let tokenMigrated = false;
        if (!existingWs?.meta_access_token && globalConfig?.meta_access_token) {
            await (prisma.workspace as any).update({
                where: { id: user.workspace_id },
                data: { meta_access_token: globalConfig.meta_access_token },
            });
            tokenMigrated = true;
        }

        return NextResponse.json({ ok: true, workspace_id: user.workspace_id, accounts_migrated: result.count, token_migrated: tokenMigrated });
    }

    // Migrate GlobalConfig token to the new workspace
    const globalConfig = await (prisma as any).globalConfig.findUnique({ where: { id: 'singleton' } });
    const globalToken = globalConfig?.meta_access_token ?? null;

    // Create workspace for legacy user (with token if available)
    const workspace = await (prisma.workspace as any).create({
        data: {
            nome_empresa: workspaceName || email.split("@")[0],
            status: "ACTIVE",
            ...(globalToken ? { meta_access_token: globalToken } : {}),
        },
    });

    // Update user with new workspace
    await prisma.user.update({
        where: { id: user.id },
        data: { workspace_id: workspace.id },
    });

    // Assign all orphaned accounts to this workspace
    const result = await prisma.account.updateMany({
        where: { workspace_id: null },
        data: { workspace_id: workspace.id },
    });

    return NextResponse.json({
        ok: true,
        workspace_id: workspace.id,
        accounts_migrated: result.count,
        token_migrated: !!globalToken,
        message: `Workspace criada${globalToken ? ' com token Meta migrado' : ''}. Refaça o login para atualizar o token.`,
    });
}
