import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Optimization goal + billing event + destination_type per campaign objective
// API v24: billing_event must be IMPRESSIONS for all OUTCOME_* objectives
// destination_type is required for OUTCOME_LEADS and OUTCOME_TRAFFIC in v24
// LINK_CLICKS + WEBSITE works for landing page campaigns without page_id or pixel
const OBJECTIVE_MAP: Record<string, { optimization_goal: string; billing_event: string; destination_type?: string }> = {
    OUTCOME_LEADS:       { optimization_goal: "LINK_CLICKS",           billing_event: "IMPRESSIONS", destination_type: "WEBSITE" },
    OUTCOME_TRAFFIC:     { optimization_goal: "LINK_CLICKS",           billing_event: "IMPRESSIONS", destination_type: "WEBSITE" },
    OUTCOME_SALES:       { optimization_goal: "LINK_CLICKS",           billing_event: "IMPRESSIONS", destination_type: "WEBSITE" },
    OUTCOME_AWARENESS:   { optimization_goal: "REACH",                 billing_event: "IMPRESSIONS" },
    OUTCOME_ENGAGEMENT:  { optimization_goal: "POST_ENGAGEMENT",       billing_event: "IMPRESSIONS" },
};

// Search Meta interest IDs for a given keyword
async function searchInterests(query: string, token: string): Promise<{ id: string; name: string }[]> {
    try {
        const url = `https://graph.facebook.com/v24.0/search?type=adinterest&q=${encodeURIComponent(query)}&access_token=${token}&limit=3`;
        const res = await fetch(url);
        const data = await res.json();
        return data.data || [];
    } catch {
        return [];
    }
}

// Search Meta geo region key for a given region name in Brazil
async function searchGeoRegion(query: string, token: string): Promise<string | null> {
    try {
        const url = `https://graph.facebook.com/v24.0/search?type=adgeolocation&q=${encodeURIComponent(query)}&location_types=["region"]&country_code=BR&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.data?.[0]?.key ?? null;
    } catch {
        return null;
    }
}

interface AdSetConfig {
    name: string;
    interests: string[];
    age_min: number;
    age_max: number;
    countries: string[];
    excluded_regions: string[];
    destination_type?: string;
    optimization_goal?: string;
    advantage_audience?: number;
    page_id?: string;
    bid_strategy?: string;
    bid_amount?: number;
    // Ad (anúncio) fields
    creative_image_url?: string;
    ad_name?: string;
    ad_headline?: string;
    ad_body?: string;
    ad_destination_url?: string;
    ad_cta_type?: string;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { accountId, name, objective, specialAdCategories, budget, adSets = [], customToken, pageId, budgetType = 'ABO', bidStrategy = 'LOWEST_COST_WITHOUT_CAP', bidAmount } = body;

        if (!accountId || !name) {
            return NextResponse.json({ error: "accountId e name são obrigatórios." }, { status: 400 });
        }

        // 1. Get Token: customToken > dbAccount.access_token > ENV fallback
        const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        let token = customToken?.trim() || process.env.META_ACCESS_TOKEN;

        if (!customToken?.trim()) {
            const dbAccount = await prisma.account.findUnique({
                where: { account_id: normalizedId }
            });
            if (dbAccount?.access_token) {
                token = dbAccount.access_token;
            }
        }

        if (!token) {
            return NextResponse.json({ error: "Token do Meta não encontrado." }, { status: 400 });
        }

        // 2. Create Campaign via Graph API fetch (SDK silently drops unknown params like objective)
        const isCBO = budgetType === 'CBO';
        const campaignBody: Record<string, any> = {
            name: name || "Campanha Gerada por IA",
            objective: objective || 'OUTCOME_LEADS',
            status: 'PAUSED',
            special_ad_categories: (specialAdCategories || []).filter((c: string) => c !== 'NONE'),
            access_token: token,
        };
        if (isCBO) {
            // CBO: budget + bid strategy at campaign level
            campaignBody.daily_budget = budget ? Math.round(budget * 100) : 3000;
            campaignBody.bid_strategy = bidStrategy;
            if (bidStrategy !== 'LOWEST_COST_WITHOUT_CAP' && bidAmount) {
                campaignBody.bid_amount = Math.round(bidAmount * 100); // in cents
            }
        } else {
            // ABO: budget managed per ad set
            campaignBody.is_adset_budget_sharing_enabled = false;
        }
        const campaignRes = await fetch(`https://graph.facebook.com/v24.0/${normalizedId}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignBody)
        });
        const campaignData = await campaignRes.json();
        if (campaignData.error) {
            const e = campaignData.error;
            throw new Error(`[${e.code}] ${e.message}${e.error_user_msg ? ' — ' + e.error_user_msg : ''}`);
        }
        const campaignId: string = campaignData.id;

        // 3. Create Ad Sets
        const adSetIds: string[] = [];
        const adSetErrors: string[] = [];
        const adIds: string[] = [];
        const adErrors: string[] = [];
        const objConfig = OBJECTIVE_MAP[objective] || OBJECTIVE_MAP.OUTCOME_LEADS;

        // ABO: split budget evenly across ad sets. CBO: no budget on ad sets (campaign handles it)
        const numSets = Math.max((adSets as AdSetConfig[]).length, 1);
        const adSetBudget = isCBO ? null : (budget ? Math.round((budget * 100) / numSets) : 3000);

        for (const adSetConfig of (adSets as AdSetConfig[])) {
            try {
                // 3a. Resolve interest IDs from keyword names
                const interestResults: { id: string; name: string }[] = [];
                for (const keyword of (adSetConfig.interests || [])) {
                    const found = await searchInterests(keyword, token);
                    if (found.length > 0) {
                        interestResults.push({ id: found[0].id, name: found[0].name });
                    }
                }

                // 3b. Resolve excluded region keys
                const excludedRegionKeys: { key: string }[] = [];
                for (const regionName of (adSetConfig.excluded_regions || [])) {
                    const key = await searchGeoRegion(regionName, token);
                    if (key) excludedRegionKeys.push({ key });
                }

                // 3c. Build targeting object
                const advantageAudience = adSetConfig.advantage_audience ?? 0;
                // With Advantage+ audience, age_max must be 65 (Meta restriction).
                // Send age_max only if manual targeting OR if it's already 65.
                const ageMax = adSetConfig.age_max || 65;
                const targeting: Record<string, any> = {
                    geo_locations: {
                        countries: adSetConfig.countries?.length ? adSetConfig.countries : ["BR"],
                    },
                    ...(excludedRegionKeys.length > 0 && {
                        excluded_geo_locations: { regions: excludedRegionKeys }
                    }),
                    age_min: adSetConfig.age_min || 18,
                    ...(advantageAudience === 0 && { age_max: ageMax }),
                    ...(interestResults.length > 0 && {
                        flexible_spec: [{ interests: interestResults }]
                    }),
                    targeting_automation: { advantage_audience: advantageAudience },
                };

                // 3d. Create Ad Set via Graph API fetch
                // Per-adset fields take priority over OBJECTIVE_MAP defaults
                const destType = adSetConfig.destination_type || objConfig.destination_type;
                // CBO: todos os ad sets devem ter o mesmo optimization_goal (Meta restrição com LOWEST_COST_WITHOUT_CAP)
                const optGoal = isCBO ? objConfig.optimization_goal : (adSetConfig.optimization_goal || objConfig.optimization_goal);
                // ABO: bid strategy per ad set. CBO: bid strategy is on campaign, omit here
                const adSetBidStrategy = isCBO ? undefined : (adSetConfig.bid_strategy || 'LOWEST_COST_WITHOUT_CAP');
                const adSetBidAmount = adSetConfig.bid_amount ? Math.round(adSetConfig.bid_amount * 100) : undefined;
                const adSetPayload: Record<string, any> = {
                    name: adSetConfig.name || "Conjunto Gerado por IA",
                    campaign_id: campaignId,
                    status: 'PAUSED',
                    optimization_goal: optGoal,
                    billing_event: objConfig.billing_event,
                    ...(adSetBidStrategy && { bid_strategy: adSetBidStrategy }),
                    ...(adSetBidAmount && adSetBidStrategy !== 'LOWEST_COST_WITHOUT_CAP' && { bid_amount: adSetBidAmount }),
                    ...(adSetBudget !== null && { daily_budget: adSetBudget }),
                    targeting,
                    access_token: token,
                };
                if (destType) adSetPayload.destination_type = destType;
                // promoted_object: per-adset page_id takes priority, then campaign-level pageId
                const resolvedPageId = adSetConfig.page_id || pageId;
                if (resolvedPageId) adSetPayload.promoted_object = { page_id: resolvedPageId };

                const adSetRes = await fetch(`https://graph.facebook.com/v24.0/${normalizedId}/adsets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adSetPayload)
                });
                const adSetData = await adSetRes.json();
                if (adSetData.error) {
                    const e = adSetData.error;
                    throw new Error(`[${e.code}] ${e.message}${e.error_user_msg ? ' — ' + e.error_user_msg : ''}`);
                }
                const createdAdSetId: string = adSetData.id;
                adSetIds.push(createdAdSetId);

                // 4. Create Ad if creative config is provided
                if (adSetConfig.creative_image_url && adSetConfig.ad_destination_url) {
                    try {
                        const resolvedPage = adSetConfig.page_id || pageId;

                        // 4a. Upload image to get hash
                        const imgUploadRes = await fetch(`https://graph.facebook.com/v24.0/${normalizedId}/adimages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: adSetConfig.creative_image_url,
                                access_token: token,
                            })
                        });
                        const imgData = await imgUploadRes.json();
                        if (imgData.error) throw new Error(`Upload de imagem: ${imgData.error.message}`);

                        // Extract hash from response (key varies by filename)
                        const imageHash: string | undefined = (Object.values(imgData.images || {}) as any[])?.[0]?.hash;
                        if (!imageHash) throw new Error('Hash de imagem não retornado pelo Meta');

                        // 4b. Create AdCreative
                        const creativePayload: Record<string, any> = {
                            name: adSetConfig.ad_name || `Criativo - ${adSetConfig.name}`,
                            object_story_spec: {
                                ...(resolvedPage && { page_id: resolvedPage }),
                                link_data: {
                                    image_hash: imageHash,
                                    link: adSetConfig.ad_destination_url,
                                    ...(adSetConfig.ad_body && { message: adSetConfig.ad_body }),
                                    ...(adSetConfig.ad_headline && { name: adSetConfig.ad_headline }),
                                    call_to_action: {
                                        type: adSetConfig.ad_cta_type || 'LEARN_MORE',
                                        value: { link: adSetConfig.ad_destination_url },
                                    },
                                },
                            },
                            access_token: token,
                        };
                        const creativeRes = await fetch(`https://graph.facebook.com/v24.0/${normalizedId}/adcreatives`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(creativePayload),
                        });
                        const creativeData = await creativeRes.json();
                        if (creativeData.error) throw new Error(`AdCreative: ${creativeData.error.message}${creativeData.error.error_user_msg ? ' — ' + creativeData.error.error_user_msg : ''}`);

                        // 4c. Create Ad
                        const adRes = await fetch(`https://graph.facebook.com/v24.0/${normalizedId}/ads`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: adSetConfig.ad_name || `Anúncio - ${adSetConfig.name}`,
                                adset_id: createdAdSetId,
                                creative: { creative_id: creativeData.id },
                                status: 'PAUSED',
                                access_token: token,
                            }),
                        });
                        const adData = await adRes.json();
                        if (adData.error) throw new Error(`Ad: ${adData.error.message}${adData.error.error_user_msg ? ' — ' + adData.error.error_user_msg : ''}`);
                        adIds.push(adData.id);

                    } catch (adError: any) {
                        adErrors.push(`"${adSetConfig.name}": ${adError.message}`);
                    }
                }

            } catch (adSetError: any) {
                adSetErrors.push(`"${adSetConfig.name}": ${adSetError.message}`);
            }
        }

        return NextResponse.json({ success: true, campaignId, adSetIds, adSetErrors, adIds, adErrors });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Falha ao criar campanha no Meta Ads.", details: error.message },
            { status: 500 }
        );
    }
}
