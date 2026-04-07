import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Meta Webhook Verification ────────────────────────────────────────────
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe") {
        const message = `[Webhook] Verification attempt. Received: ${token}, Expected: ${process.env.META_VERIFY_TOKEN}`;
        console.log(message);

        // Log verification attempts too
        await prisma.webhookLog.create({
            data: {
                payload: JSON.stringify({ type: "verification", mode, token, challenge })
            }
        });

        if (token === process.env.META_VERIFY_TOKEN) {
            console.log("[Webhook] Meta webhook verified successfully.");
            return new NextResponse(challenge);
        }
    }

    return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: Receive Lead Events ──────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("[Webhook] Received event from Meta:", JSON.stringify(body, null, 2));

        // Save to persistent diagnostic logs
        await prisma.webhookLog.create({
            data: {
                payload: JSON.stringify(body)
            }
        });

        // Meta sends an array of entries, each with changes
        const entries = body.entry || [];

        for (const entry of entries) {
            const changes = entry.changes || [];

            for (const change of changes) {
                // We only care about leadgen events
                if (change.field !== "leadgen") continue;

                const { leadgen_id, page_id, form_id, ad_id, adset_id, campaign_id } = change.value;

                if (!leadgen_id) continue;

                // Fetch full lead data from Meta Graph API
                const leadData = await fetchLeadFromMeta(leadgen_id);
                if (!leadData) {
                    console.error(`[Webhook] Could not fetch data for lead ${leadgen_id}`);
                    continue;
                }

                // Find the account in our DB
                let account = null;

                // Priority 1: Match by Campaign ID (always present for Paid Leads)
                const effectiveCampaignId = campaign_id || leadData.campaign_id;
                if (effectiveCampaignId) {
                    const campaign = await prisma.campaign.findUnique({
                        where: { campaign_id: effectiveCampaignId },
                        include: { account: true }
                    });
                    if (campaign && campaign.account) {
                        account = campaign.account;
                        console.log(`[Webhook] Account linked via Campaign (${effectiveCampaignId}) for lead ${leadgen_id}`);
                    }
                }

                // Priority 2: Match by Form ID (fallback for Test/Organic Leads)
                const effectiveFormId = form_id || leadData.form_id;
                if (!account && effectiveFormId) {
                    const siblingLead = await prisma.lead.findFirst({
                        where: { form_id: effectiveFormId, account_id: { not: null } },
                        include: { account: true },
                        orderBy: { created_time: 'desc' }
                    });
                    if (siblingLead && siblingLead.account) {
                        account = siblingLead.account;
                        console.log(`[Webhook] Account linked via Form ID proxy (${effectiveFormId}) for lead ${leadgen_id}`);
                    }
                }

                // Priority 3: Fetch campaign from Meta API to find the ad account
                if (!account && effectiveCampaignId) {
                    try {
                        let token = process.env.META_ACCESS_TOKEN;
                        if (!token) {
                            const gc = await prisma.globalConfig.findUnique({ where: { id: 'singleton' }, select: { meta_access_token: true } });
                            token = gc?.meta_access_token || undefined;
                        }
                        if (token) {
                            const campRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveCampaignId}?fields=id,name,account_id&access_token=${token}`);
                            const campData = await campRes.json();
                            if (!campData.error && campData.account_id) {
                                const normalizedAccId = campData.account_id.startsWith('act_') ? campData.account_id : `act_${campData.account_id}`;
                                account = await prisma.account.findUnique({ where: { account_id: normalizedAccId } });
                                if (account) {
                                    // Cache the campaign so future leads link instantly
                                    await prisma.campaign.upsert({
                                        where: { campaign_id: effectiveCampaignId },
                                        update: { campaign_name: campData.name },
                                        create: { campaign_id: effectiveCampaignId, account_id: account.id, campaign_name: campData.name, date: new Date() },
                                    });
                                    console.log(`[Webhook] Account linked via Meta API campaign lookup for lead ${leadgen_id}`);
                                }
                            }
                        }
                    } catch (e: any) {
                        console.warn(`[Webhook] Meta campaign lookup failed:`, e.message);
                    }
                }

                if (!account) {
                    console.warn(`[Webhook] No account found for lead ${leadgen_id} (Campaign ID: ${effectiveCampaignId}, Form ID: ${effectiveFormId}). Saving without account link.`);
                }

                // Extract fields robustly
                const { extractLeadField } = require('@/lib/meta-api');
                const fieldData = leadData.field_data || [];
                const fullName = extractLeadField(fieldData, 'name') || 'Sem Nome';
                const email = extractLeadField(fieldData, 'email') || null;
                const phone = extractLeadField(fieldData, 'phone') || null;

                // Upsert to avoid duplicates
                await prisma.lead.upsert({
                    where: { lead_id: leadgen_id },
                    update: {
                        full_name: fullName,
                        email,
                        phone,
                        raw_data: JSON.stringify(leadData),
                        synced_at: new Date(),
                    },
                    create: {
                        lead_id: leadgen_id,
                        account_id: account?.id || null,
                        campaign_id: campaign_id || null,
                        campaign_name: null,
                        adset_id: adset_id || null,
                        adset_name: null,
                        ad_id: ad_id || null,
                        ad_name: null,
                        form_id: form_id || leadData.form_id || null,
                        full_name: fullName,
                        email,
                        phone,
                        created_time: new Date(leadData.created_time || Date.now()),
                        status: "novo",
                        raw_data: JSON.stringify(leadData),
                        synced_at: new Date(),
                    },
                });

                console.log(`[Webhook] Lead saved: ${leadgen_id} | Name: ${fullName} | Email: ${email}`);
            }
        }

        // Always return 200 quickly so Meta doesn't retry
        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[Webhook] Error processing lead:", error);
        // Still return 200 to prevent Meta from disabling the webhook
        return NextResponse.json({ received: true, error: error.message });
    }
}

// ─── Helper: Fetch full lead data from Meta Graph API ──────────────────────────
async function fetchLeadFromMeta(leadId: string) {
    let token = process.env.META_ACCESS_TOKEN;
    if (!token) {
        const globalConfig = await prisma.globalConfig.findUnique({
            where: { id: 'singleton' },
            select: { meta_access_token: true }
        });
        token = globalConfig?.meta_access_token || undefined;
    }

    if (!token) {
        console.error("[Webhook] Meta Access Token not found.");
        return null;
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${leadId}?fields=id,created_time,field_data,ad_id,adset_id,campaign_id,form_id&access_token=${token}`;
        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.text();
            console.error(`[Webhook] Meta API error fetching lead ${leadId}:`, err);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`[Webhook] Failed to fetch lead ${leadId}:`, error);
        return null;
    }
}
