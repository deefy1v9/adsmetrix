"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/auth";
import { sendTextMessage } from "@/lib/uazapi";
import type { UazAPIConfig } from "@/lib/uazapi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WaBlastRecord {
    id: string;
    name: string;
    enabled: boolean;
    schedule_days: number[];
    schedule_time: string;
    messages: string[];
    destination_type: string;
    destination_id: string | null;
    destination_name: string | null;
    last_sent_at: Date | null;
    created_at: Date;
}

export interface WaBlastFormData {
    name: string;
    enabled: boolean;
    schedule_days: number[];
    schedule_time: string;
    messages: string[];
    destination_type: string;
    destination_id: string;
    destination_name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUazConfig(workspaceId: string): Promise<UazAPIConfig | null> {
    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
    if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) return null;
    return { baseUrl: setting.uazapi_url, token: setting.uazapi_token, instance: setting.uazapi_instance };
}

function mapRecord(item: any): WaBlastRecord {
    return {
        ...item,
        schedule_days: item.schedule_days as number[],
        messages: item.messages as string[],
    };
}

// ── CRUD Actions ──────────────────────────────────────────────────────────────

export async function listWaBlastAutomationsAction(): Promise<WaBlastRecord[]> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return [];
    const items = await prisma.waBlastAutomation.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: "asc" },
    });
    return items.map(mapRecord);
}

export async function createWaBlastAutomationAction(data: WaBlastFormData): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: "Não autenticado" };
    await prisma.waBlastAutomation.create({
        data: {
            workspace_id: workspaceId,
            name: data.name,
            enabled: data.enabled,
            schedule_days: data.schedule_days,
            schedule_time: data.schedule_time,
            messages: data.messages.filter(m => m.trim()),
            destination_type: data.destination_type,
            destination_id: data.destination_id || null,
            destination_name: data.destination_name || null,
        },
    });
    return { success: true };
}

export async function updateWaBlastAutomationAction(id: string, data: WaBlastFormData): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: "Não autenticado" };
    await prisma.waBlastAutomation.updateMany({
        where: { id, workspace_id: workspaceId },
        data: {
            name: data.name,
            enabled: data.enabled,
            schedule_days: data.schedule_days,
            schedule_time: data.schedule_time,
            messages: data.messages.filter(m => m.trim()),
            destination_type: data.destination_type,
            destination_id: data.destination_id || null,
            destination_name: data.destination_name || null,
        },
    });
    return { success: true };
}

export async function deleteWaBlastAutomationAction(id: string): Promise<{ success: boolean }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false };
    await prisma.waBlastAutomation.deleteMany({ where: { id, workspace_id: workspaceId } });
    return { success: true };
}

export async function toggleWaBlastAutomationAction(id: string, enabled: boolean): Promise<{ success: boolean }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false };
    await prisma.waBlastAutomation.updateMany({ where: { id, workspace_id: workspaceId }, data: { enabled } });
    return { success: true };
}

// ── Send Action ───────────────────────────────────────────────────────────────

export async function runWaBlastNowAction(id: string): Promise<{ success: boolean; sent: number; error?: string }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, sent: 0, error: "Não autenticado" };

    const automation = await prisma.waBlastAutomation.findFirst({ where: { id, workspace_id: workspaceId } });
    if (!automation) return { success: false, sent: 0, error: "Automação não encontrada" };

    const config = await getUazConfig(workspaceId);
    if (!config) return { success: false, sent: 0, error: "WhatsApp não configurado nas configurações" };

    const dest = automation.destination_id;
    if (!dest) return { success: false, sent: 0, error: "Destino não configurado" };

    const messages = automation.messages as string[];
    let sent = 0;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.trim()) continue;
        const result = await sendTextMessage(config, dest, msg);
        if (result.success) sent++;
        if (i < messages.length - 1) await new Promise(r => setTimeout(r, 1200));
    }

    await prisma.waBlastAutomation.update({ where: { id }, data: { last_sent_at: new Date() } });

    return { success: sent > 0, sent };
}

// ── Cron Send (called by /api/cron/wa-blast) ─────────────────────────────────

export async function sendScheduledWaBlastsAction(todayDay: number, currentTime: string) {
    const allAutomations = await prisma.waBlastAutomation.findMany({ where: { enabled: true } });

    const toSend = allAutomations.filter(auto => {
        const days = auto.schedule_days as number[];
        if (!days.includes(todayDay)) return false;
        const [h, m] = auto.schedule_time.split(":").map(Number);
        const [ch, cm] = currentTime.split(":").map(Number);
        return Math.abs((h * 60 + m) - (ch * 60 + cm)) <= 5;
    });

    const results = [];

    for (const auto of toSend) {
        const config = await getUazConfig(auto.workspace_id);
        if (!config) { results.push({ id: auto.id, name: auto.name, success: false, error: "WA não configurado" }); continue; }

        const dest = auto.destination_id;
        if (!dest) { results.push({ id: auto.id, name: auto.name, success: false, error: "Sem destino" }); continue; }

        const messages = auto.messages as string[];
        let sent = 0;
        for (let i = 0; i < messages.length; i++) {
            if (!messages[i].trim()) continue;
            const r = await sendTextMessage(config, dest, messages[i]);
            if (r.success) sent++;
            if (i < messages.length - 1) await new Promise(r => setTimeout(r, 1200));
        }

        await prisma.waBlastAutomation.update({ where: { id: auto.id }, data: { last_sent_at: new Date() } });
        results.push({ id: auto.id, name: auto.name, success: sent > 0, sent });
    }

    return { processed: toSend.length, results };
}
