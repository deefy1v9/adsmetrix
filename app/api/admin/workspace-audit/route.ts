import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * GET /api/admin/workspace-audit
 * Audita o estado de workspaces, usuários e contas no banco.
 * Protegido por CRON_SECRET ou super-admin.
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const h = await headers();
    const isSuperAdmin = h.get("x-super-admin") === "true";
    const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isSuperAdmin && !hasSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // GlobalConfig
    const globalConfig = await (prisma as any).globalConfig.findUnique({
        where: { id: 'singleton' },
        select: { meta_access_token: true, criativo_art_api_key: true },
    });

    // Workspaces
    const workspaces = await (prisma.workspace as any).findMany({
        select: { id: true, nome_empresa: true, status: true, meta_access_token: true },
    });

    // Users
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, workspace_id: true },
    });

    // Accounts grouped
    const accountsWithWorkspace = await prisma.account.count({ where: { workspace_id: { not: null } } });
    const accountsWithoutWorkspace = await prisma.account.count({ where: { workspace_id: null } });
    const accountsDetail = await prisma.account.findMany({
        select: { id: true, account_id: true, account_name: true, workspace_id: true },
        orderBy: { workspace_id: "asc" },
    });

    return NextResponse.json({
        summary: {
            workspaces: workspaces.length,
            users: users.length,
            accounts_with_workspace: accountsWithWorkspace,
            accounts_without_workspace: accountsWithoutWorkspace,
            global_meta_token: globalConfig?.meta_access_token ? "✅ configurado" : "❌ não configurado",
            global_criativo_key: globalConfig?.criativo_art_api_key ? "✅ configurado" : "❌ não configurado",
        },
        workspaces: workspaces.map((w: any) => ({
            ...w,
            meta_access_token: w.meta_access_token ? "✅ configurado" : "❌ não configurado",
        })),
        users: users.map(u => ({
            ...u,
            workspace_status: u.workspace_id ? `✅ ${u.workspace_id}` : "❌ sem workspace",
        })),
        accounts: accountsDetail.map(a => ({
            account_id: a.account_id,
            name: a.account_name,
            workspace_id: a.workspace_id ?? "❌ null",
        })),
    });
}
