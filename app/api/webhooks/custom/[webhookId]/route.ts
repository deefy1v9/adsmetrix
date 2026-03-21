import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ webhookId: string }> }) {
    try {
        const resolvedParams = await params;
        const { webhookId } = resolvedParams;

        if (!webhookId) {
            return NextResponse.json({ success: false, error: "Webhook ID ausente." }, { status: 400 });
        }

        // 1. Find the parent account linked to this webhook UUID
        const account = await prisma.account.findUnique({
            where: { custom_webhook_id: webhookId }
        });

        if (!account) {
            return NextResponse.json({ success: false, error: "Webhook inv\u00e1lida ou conta n\u00e3o encontrada." }, { status: 404 });
        }

        // 2. Safely parse incoming payload (support JSON and FormData)
        let rawBody: Record<string, any> = {};
        const contentType = req.headers.get("content-type") || "";

        try {
            if (contentType.includes("application/json")) {
                rawBody = await req.json();
            } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
                const formData = await req.formData();
                formData.forEach((value, key) => {
                    rawBody[key] = value.toString();
                });
            } else {
                // Try json fallback for tools that don't send content-type correctly
                const text = await req.text();
                rawBody = text ? JSON.parse(text) : {};
            }
        } catch (e: any) {
            console.warn(`[CustomWebhook] Failed to parse payload for ${webhookId}:`, e.message);
            return NextResponse.json({ success: false, error: "Formato de payload inv\u00e1lido." }, { status: 400 });
        }

        console.log(`[CustomWebhook] Received payload for account ${account.account_name}:`);
        console.log(JSON.stringify(rawBody, null, 2));

        let extractedName: string = 'Sem Nome (Webhook)';
        let extractedEmail: string | null = null;
        let extractedPhone: string | null = null;
        let originUrl: string = 'Webhook Direto';

        // 3. Robust field extraction mapping
        {
            // Standard / Elementor fallback
            const { extractLeadField } = require('@/lib/meta-api');

            // Convert flat object into an array of { name, values: [] } format expected by extractLeadField
            const fieldData = Object.entries(rawBody)
                .filter(([key]) => {
                    // Ignore Elementor metadata keys that conflict with actual field names
                    if (key.startsWith('form[') || key.startsWith('meta[')) return false;
                    // If this is a nested WordPress/Elementor field, only process the actual value keys
                    if (key.startsWith('fields[') && key.includes(']')) {
                        return key.endsWith('[value]') || key.endsWith('[raw_value]');
                    }
                    return true;
                })
                .map(([key, value]) => {
                    let cleanKey = key;
                    if (cleanKey.includes('[') && cleanKey.includes(']')) {
                        const matches = [...cleanKey.matchAll(/\[(.*?)\]/g)];
                        if (matches.length > 0) cleanKey = matches[0][1];
                    }
                    return { name: cleanKey, values: [String(value || '')] };
                });

            console.log(`[CustomWebhook] Transformed fieldData for extractLeadField:`, JSON.stringify(fieldData, null, 2));

            extractedName = extractLeadField(fieldData, 'name') || 'Sem Nome (Webhook)';
            extractedEmail = extractLeadField(fieldData, 'email') || null;
            extractedPhone = extractLeadField(fieldData, 'phone') || null;

            // Extract origin URL to display in the UI (below phone number)
            originUrl = String(
                rawBody?.meta?.page_url ||
                rawBody?.['meta[page_url]'] ||
                rawBody?.page_url ||
                rawBody?.source_url ||
                rawBody?.url ||
                'Webhook Direto'
            );
        }

        // Generate a random stable ID since external forms don't always provide one
        const syntheticLeadId = `cw_${randomUUID().replace(/-/g, '').substring(0, 15)}`;

        // 4. Save to Database
        const newLead = await prisma.lead.create({
            data: {
                lead_id: syntheticLeadId,
                account_id: account.id,
                ad_name: originUrl, // Map URL to ad_name so the UI can display it
                full_name: extractedName,
                email: extractedEmail,
                phone: extractedPhone,
                created_time: new Date(),
                status: "novo",
                platform: "custom_webhook",
                raw_data: JSON.stringify(rawBody),
                synced_at: new Date()
            }
        });

        console.log(`[CustomWebhook] Lead saved: ${syntheticLeadId} | Name: ${extractedName}`);

        return NextResponse.json({ success: true, lead_id: syntheticLeadId });

    } catch (error: any) {
        console.error("[CustomWebhook] Catch-all error:", error);
        return NextResponse.json({ success: false, error: "Erro interno no servidor webhook" }, { status: 500 });
    }
}
