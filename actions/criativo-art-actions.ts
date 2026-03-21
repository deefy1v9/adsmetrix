'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function getWorkspaceId(): Promise<string | undefined> {
    const h = await headers();
    return h.get("x-workspace-id") ?? undefined;
}

async function getOrCreateSetting(workspaceId: string) {
    return prisma.setting.upsert({
        where: { workspace_id: workspaceId },
        create: { workspace_id: workspaceId },
        update: {},
    });
}

export async function getCriativoArtKeyAction() {
    try {
        const workspaceId = await getWorkspaceId();

        if (workspaceId) {
            const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
            return { success: true, apiKey: (setting as any)?.criativo_art_api_key || '' };
        }

        // Fallback: GlobalConfig for legacy users without workspace
        const config = await prisma.globalConfig.findUnique({ where: { id: 'singleton' } }) as any;
        return { success: true, apiKey: config?.criativo_art_api_key || '' };
    } catch (error) {
        console.error('[CriativoArt] Error fetching key:', error);
        return { success: false, apiKey: '' };
    }
}

export async function saveCriativoArtKeyAction(apiKey: string) {
    try {
        const workspaceId = await getWorkspaceId();

        if (workspaceId) {
            await getOrCreateSetting(workspaceId);
            await prisma.setting.update({
                where: { workspace_id: workspaceId },
                data: { criativo_art_api_key: apiKey.trim() } as any,
            });
            revalidatePath('/settings');
            return { success: true };
        }

        // Fallback: GlobalConfig for legacy users without workspace
        await (prisma.globalConfig as any).upsert({
            where: { id: 'singleton' },
            update: { criativo_art_api_key: apiKey.trim() },
            create: { id: 'singleton', criativo_art_api_key: apiKey.trim() },
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('[CriativoArt] Error saving key:', error);
        return { success: false, error: 'Erro ao salvar chave.' };
    }
}
