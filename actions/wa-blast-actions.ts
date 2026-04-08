"use server";

import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/uazapi";
import type { UazAPIConfig } from "@/lib/uazapi";
import { sendTemplateWithText } from "@/lib/meta-wa-client";
import type { MetaWAConfig } from "@/lib/meta-wa-client";

async function getWorkspaceId(): Promise<string | null> {
    const h = await headers();
    return h.get("x-workspace-id");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WaBlastDestination {
    id: string;
    name: string;
}

export interface WaBlastRecord {
    id: string;
    name: string;
    enabled: boolean;
    schedule_days: number[];
    schedule_time: string;
    messages: string[];
    destination_type: string;
    destination_ids: WaBlastDestination[];
    destination_id: string | null;
    destination_name: string | null;
    channel: "uazapi" | "meta_api";
    template_name: string;
    template_language: string;
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
    destination_ids: WaBlastDestination[];  // always use this
    channel: "uazapi" | "meta_api";
    template_name: string;
    template_language: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUazConfig(workspaceId: string): Promise<UazAPIConfig | null> {
    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
    if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) return null;
    return { baseUrl: setting.uazapi_url, token: setting.uazapi_token, instance: setting.uazapi_instance };
}

async function getMetaWAConfig(workspaceId: string): Promise<MetaWAConfig | null> {
    const setting = await prisma.setting.findUnique({ where: { workspace_id: workspaceId } });
    if (!setting?.meta_wa_phone_number_id || !setting?.meta_wa_access_token) return null;
    return { phoneNumberId: setting.meta_wa_phone_number_id, accessToken: setting.meta_wa_access_token };
}

function mapRecord(item: any): WaBlastRecord {
    const destIds = (item.destination_ids as WaBlastDestination[] | null) ?? [];
    // Migrate legacy single dest → multi if needed
    const migrated: WaBlastDestination[] = destIds.length > 0
        ? destIds
        : item.destination_id
            ? [{ id: item.destination_id, name: item.destination_name || item.destination_id }]
            : [];
    return {
        ...item,
        schedule_days: item.schedule_days as number[],
        messages: item.messages as string[],
        destination_ids: migrated,
        channel: (item.channel as "uazapi" | "meta_api") ?? "uazapi",
        template_name: item.template_name ?? "",
        template_language: item.template_language ?? "pt_BR",
    };
}

async function sendToAllDests(
    record: WaBlastRecord,
    uazConfig: UazAPIConfig | null,
    metaConfig: MetaWAConfig | null
): Promise<number> {
    const { destination_ids: dests, messages, channel, template_name, template_language } = record;
    let totalSent = 0;

    for (let di = 0; di < dests.length; di++) {
        const dest = dests[di];
        for (let i = 0; i < messages.length; i++) {
            if (!messages[i].trim()) continue;

            if (channel === "meta_api") {
                if (!metaConfig) continue;
                const r = await sendTemplateWithText(metaConfig, dest.id, template_name || "", messages[i], template_language || "pt_BR");
                if (r.success) totalSent++;
            } else {
                if (!uazConfig) continue;
                const r = await sendTextMessage(uazConfig, dest.id, messages[i]);
                if (r.success) totalSent++;
            }

            if (i < messages.length - 1) await new Promise(r => setTimeout(r, 1200));
        }
        if (di < dests.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    return totalSent;
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
    const first = data.destination_ids[0];
    await prisma.waBlastAutomation.create({
        data: {
            workspace_id: workspaceId,
            name: data.name,
            enabled: data.enabled,
            schedule_days: data.schedule_days,
            schedule_time: data.schedule_time,
            messages: data.messages.filter(m => m.trim()),
            destination_type: data.destination_type,
            destination_ids: data.destination_ids as unknown as Prisma.InputJsonValue,
            destination_id: first?.id ?? null,
            destination_name: first?.name ?? null,
            channel: data.channel,
            template_name: data.template_name || null,
            template_language: data.template_language || "pt_BR",
        },
    });
    return { success: true };
}

export async function updateWaBlastAutomationAction(id: string, data: WaBlastFormData): Promise<{ success: boolean; error?: string }> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return { success: false, error: "Não autenticado" };
    const first = data.destination_ids[0];
    await prisma.waBlastAutomation.updateMany({
        where: { id, workspace_id: workspaceId },
        data: {
            name: data.name,
            enabled: data.enabled,
            schedule_days: data.schedule_days,
            schedule_time: data.schedule_time,
            messages: data.messages.filter(m => m.trim()),
            destination_type: data.destination_type,
            destination_ids: data.destination_ids as unknown as Prisma.InputJsonValue,
            destination_id: first?.id ?? null,
            destination_name: first?.name ?? null,
            channel: data.channel,
            template_name: data.template_name || null,
            template_language: data.template_language || "pt_BR",
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

    const record = mapRecord(automation);
    if (record.destination_ids.length === 0) return { success: false, sent: 0, error: "Nenhum destino configurado" };

    const uazConfig = record.channel === "uazapi" ? await getUazConfig(workspaceId) : null;
    const metaConfig = record.channel === "meta_api" ? await getMetaWAConfig(workspaceId) : null;

    if (record.channel === "uazapi" && !uazConfig) return { success: false, sent: 0, error: "UazAPI não configurado nas configurações" };
    if (record.channel === "meta_api" && !metaConfig) return { success: false, sent: 0, error: "Meta API não configurada nas configurações" };
    if (record.channel === "meta_api" && !record.template_name) return { success: false, sent: 0, error: "Nome do template não configurado" };

    const sent = await sendToAllDests(record, uazConfig, metaConfig);
    await prisma.waBlastAutomation.update({ where: { id }, data: { last_sent_at: new Date() } });

    return { success: sent > 0, sent };
}

// ── Groups from existing automations ─────────────────────────────────────────

export async function getGroupsFromAutomationsAction(): Promise<WaBlastDestination[]> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return [];

    const automations = await prisma.reportAutomation.findMany({
        where: { workspace_id: workspaceId, destination_type: "group" },
        select: { destination_id: true, destination_name: true },
    });

    const seen = new Set<string>();
    const groups: WaBlastDestination[] = [];

    for (const a of automations) {
        if (a.destination_id && !seen.has(a.destination_id)) {
            seen.add(a.destination_id);
            groups.push({ id: a.destination_id, name: a.destination_name || a.destination_id });
        }
    }

    return groups;
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
        const record = mapRecord(auto);
        if (record.destination_ids.length === 0) {
            results.push({ id: auto.id, name: auto.name, success: false, error: "Sem destino" });
            continue;
        }

        const uazConfig = record.channel === "uazapi" ? await getUazConfig(auto.workspace_id) : null;
        const metaConfig = record.channel === "meta_api" ? await getMetaWAConfig(auto.workspace_id) : null;
        if (record.channel === "uazapi" && !uazConfig) { results.push({ id: auto.id, name: auto.name, success: false, error: "UazAPI não configurado" }); continue; }
        if (record.channel === "meta_api" && !metaConfig) { results.push({ id: auto.id, name: auto.name, success: false, error: "Meta API não configurada" }); continue; }

        const sent = await sendToAllDests(record, uazConfig, metaConfig);
        await prisma.waBlastAutomation.update({ where: { id: auto.id }, data: { last_sent_at: new Date() } });
        results.push({ id: auto.id, name: auto.name, success: sent > 0, sent });
    }

    return { processed: toSend.length, results };
}
