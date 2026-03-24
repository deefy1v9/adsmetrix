import { FacebookAdsApi, AdAccount, Campaign, User, Lead, Page } from 'facebook-nodejs-business-sdk';

import { prisma } from './prisma';

async function getAccessToken(accountId?: string, workspaceId?: string): Promise<string> {
    try {
        // 1. Try to find account-specific token
        if (accountId) {
            const account = await prisma.account.findUnique({
                where: { account_id: accountId.startsWith('act_') ? accountId : `act_${accountId}` },
                select: { access_token: true }
            });
            if (account?.access_token) return account.access_token;
        }

        // 2. Try workspace-specific token
        if (workspaceId) {
            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { meta_access_token: true }
            });
            if (workspace?.meta_access_token) return workspace.meta_access_token;
        }

        // 3. Try global token from DB (legacy fallback)
        const globalConfig = await prisma.globalConfig.findUnique({
            where: { id: 'singleton' },
            select: { meta_access_token: true }
        });
        if (globalConfig?.meta_access_token) return globalConfig.meta_access_token;
    } catch (dbError) {
        console.warn("[MetaAPI] Database error fetching token, falling back to ENV:", (dbError as any).message);
    }

    // 4. Fallback to ENV (Used for Dashboard KPIs etc.)
    const envToken = process.env.META_ACCESS_TOKEN;
    if (!envToken) {
        throw new Error("Conexão com Meta necessária ou META_ACCESS_TOKEN ausente no .env.");
    }
    return envToken;
}

// Helper to initialize SDK for a specific token
function initSdk(token: string) {
    return FacebookAdsApi.init(token);
}

import { MetaAdAccount, MetaCampaign, MetaLead, MetaCreative, calculateAvailableBalance, getPaymentLabel } from './balance-utils';

export { type MetaAdAccount, type MetaCampaign, type MetaLead, type MetaCreative, calculateAvailableBalance, getPaymentLabel };



// In-memory cache to reduce Meta API calls
const accountsCache = new Map<string, { data: MetaAdAccount[], ts: number }>();
const campaignsCache = new Map<string, { data: MetaCampaign[], ts: number }>();
const ACCOUNTS_TTL = 5 * 60 * 1000;   // 5 minutes
const CAMPAIGNS_TTL = 2 * 60 * 1000;  // 2 minutes

export function invalidateAccountsCache() {
    accountsCache.clear();
}

export async function getAdAccounts(workspaceId?: string): Promise<MetaAdAccount[]> {
    const cacheKey = workspaceId ?? 'global';
    const cached = accountsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ACCOUNTS_TTL) {
        console.log(`[MetaAPI] getAdAccounts — cache HIT (${cacheKey})`);
        return cached.data;
    }
    console.log(`[MetaAPI] getAdAccounts called (${cacheKey}).`);
    try {
        const token = await getAccessToken(undefined, workspaceId);
        initSdk(token);
        const fields = [
            'name',
            'account_id',
            'currency',
            'account_status',
            'balance',
            'amount_spent',
            'spend_cap',
            'is_prepay_account',
            'funding_source_details'
        ];

        let allAccounts: any[] = [];

        // Method 1: Use SDK
        try {
            const user = new User('me');
            let accountsCollection = await (user as any).getAdAccounts(fields, { limit: 100 });
            allAccounts = [...(accountsCollection || [])];

            // Handle SDK pagination if active
            let currentCollection = accountsCollection;
            while (currentCollection && (currentCollection as any).hasNext()) {
                currentCollection = await (currentCollection as any).next();
                if (currentCollection) {
                    allAccounts = [...allAccounts, ...currentCollection];
                }
            }
            console.log(`[MetaAPI] SDK found total ${allAccounts.length} ad accounts.`);
        } catch (e) {
            console.error("[MetaAPI] SDK getAdAccounts failed:", (e as any).message);
        }

        // Method 2: Manual Fetch Fallback (if SDK found nothing or failed)
        if (allAccounts.length === 0) {
            console.log("[MetaAPI] Attempting manual Graph API fetch with pagination...");
            const token = await getAccessToken(undefined, workspaceId);
            let nextUrl: string | null = `https://graph.facebook.com/v20.0/me/adaccounts?fields=${fields.join(',')}&limit=100&access_token=${token}`;

            while (nextUrl) {
                const response: any = await fetch(nextUrl);
                const data: any = await response.json();

                if (data.error) {
                    console.error("[MetaAPI] Graph API Error:", data.error);
                    if (allAccounts.length > 0) break; // Return what we got so far
                    throw new Error(`Meta API: ${data.error.message}`);
                }

                if (data.data) {
                    allAccounts = [...allAccounts, ...data.data];
                }

                nextUrl = data.paging?.next || null;
                console.log(`[MetaAPI] Manual fetch page received. Total so far: ${allAccounts.length}`);
            }
        }

        if (allAccounts.length === 0) {
            console.warn("[MetaAPI] No ad accounts found for this token.");
            return [];
        }

        const result = allAccounts.map((account: any) => {
            const id = account.id || `act_${account.account_id}`;
            const numericId = account.account_id || id.replace('act_', '');
            const prefixedId = `act_${numericId}`;

            return {
                id: prefixedId,
                name: account.name || "Sem nome",
                account_id: prefixedId, // Standardize on prefixed ID
                currency: account.currency || "BRL",
                account_status: account.account_status,
                balance: account.balance ? parseFloat(account.balance.toString()) : 0,
                amount_spent: account.amount_spent ? parseFloat(account.amount_spent.toString()) : 0,
                spend_cap: account.spend_cap ? parseFloat(account.spend_cap.toString()) : 0,
                is_prepay_account: !!account.is_prepay_account,
                funding_source_details: account.funding_source_details
            };
        });
        accountsCache.set(cacheKey, { data: result, ts: Date.now() });
        return result;
    } catch (error) {
        console.error("[MetaAPI] Fatal error in getAdAccounts:", error);
        return [];
    }
}

export async function getCampaigns(accountId: string, datePreset: string = 'maximum', workspaceId?: string): Promise<MetaCampaign[]> {
    const cacheKey = `${accountId}_${datePreset}`;
    const cached = campaignsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CAMPAIGNS_TTL) {
        console.log(`[MetaAPI] getCampaigns — cache HIT (${cacheKey})`);
        return cached.data;
    }
    try {
        const token = await getAccessToken(accountId, workspaceId);
        initSdk(token);
        const account = new AdAccount(accountId);
        const fields = ['name', 'status', 'objective'];
        let campaignsCollection = await account.getCampaigns(fields, { limit: 100 });
        let campaigns = [...(campaignsCollection || [])];

        // Handle pagination to fetch ALL campaigns
        let currentCollection = campaignsCollection;
        while (currentCollection && (currentCollection as any).hasNext()) {
            currentCollection = await (currentCollection as any).next();
            if (currentCollection) {
                campaigns = [...campaigns, ...currentCollection];
            }
        }

        console.log(`[MetaAPI] Found total ${campaigns.length} campaigns for account ${accountId}.`);

        const campaignsWithInsights = await Promise.all(
            campaigns.map(async (campaign: any) => {
                try {
                    const insightsFields = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'cpp', 'actions'];
                    const metaPreset = ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month', 'last_month', 'maximum'].includes(datePreset)
                        ? datePreset
                        : 'maximum';

                    const insights = await campaign.getInsights(insightsFields, { date_preset: metaPreset });
                    const insight = insights[0] || {};

                    if (!insights[0]) {
                        console.warn(`[MetaAPI] No insights returned for campaign: ${campaign.name} (${campaign.id})`);
                    }

                    // Find lead actions and messaging actions
                    let totalLeadsValue = 0;
                    let conversationsValue = 0;
                    let salesValue = 0;
                    let leadsGTMValue = 0;
                    let leadsMetaValue = 0;
                    let pagelikesValue = 0;
                    let postEngagementsValue = 0;
                    let commentsValue = 0;
                    let videoViewsValue = 0;

                    if (insight.actions) {
                        // Total Generic Leads
                        const totalLeadAction = insight.actions.find((a: any) => a.action_type === 'lead');
                        if (totalLeadAction) {
                            totalLeadsValue = parseInt(totalLeadAction.value || '0');
                        }

                        // GTM Leads
                        const gtmLeadAction = insight.actions.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_lead');
                        if (gtmLeadAction) {
                            leadsGTMValue = parseInt(gtmLeadAction.value || '0');
                        }

                        // Meta Native Leads (Total leads minus GTM leads)
                        leadsMetaValue = Math.max(0, totalLeadsValue - leadsGTMValue);

                        // Sales / Purchases
                        const salesActions = insight.actions.filter((a: any) => a.action_type.includes('purchase'));
                        salesValue = salesActions.reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);

                        // Conversations started from Click-to-WhatsApp ads
                        // Priority: messaging_conversation_started_7d (main CTWA metric shown in Meta Ads Manager)
                        const ctwaActions = insight.actions.filter((a: any) =>
                            a.action_type.includes('messaging_conversation_started')
                        );
                        if (ctwaActions.length > 0) {
                            conversationsValue = ctwaActions.reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
                        } else {
                            // Fallback for Sponsored Messages campaigns only
                            const firstReplyActions = insight.actions.filter((a: any) =>
                                a.action_type.includes('messaging_first_reply')
                            );
                            if (firstReplyActions.length > 0) {
                                conversationsValue = firstReplyActions.reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
                            }
                        }

                        // Page likes (new followers from ads)
                        const pageLikeAction = insight.actions.find((a: any) =>
                            a.action_type === 'page_like' || a.action_type === 'like'
                        );
                        if (pageLikeAction) pagelikesValue = parseInt(pageLikeAction.value || '0');

                        // Post engagements
                        const postEngagementAction = insight.actions.find((a: any) =>
                            a.action_type === 'post_engagement'
                        );
                        if (postEngagementAction) postEngagementsValue = parseInt(postEngagementAction.value || '0');

                        // Comments
                        const commentAction = insight.actions.find((a: any) =>
                            a.action_type === 'comment'
                        );
                        if (commentAction) commentsValue = parseInt(commentAction.value || '0');

                        // Video views
                        const videoViewAction = insight.actions.find((a: any) =>
                            a.action_type === 'video_view'
                        );
                        if (videoViewAction) videoViewsValue = parseInt(videoViewAction.value || '0');
                    }

                    return {
                        id: campaign.id,
                        name: campaign.name,
                        status: campaign.status,
                        objective: campaign.objective,
                        insights: {
                            impressions: insight.impressions || '0',
                            clicks: insight.clicks || '0',
                            spend: insight.spend || '0',
                            cpc: insight.cpc || '0',
                            ctr: insight.ctr || '0',
                            leads: totalLeadsValue.toString(),
                            leads_form: leadsMetaValue.toString(),
                            leads_gtm: leadsGTMValue.toString(),
                            sales: salesValue.toString(),
                            conversations: conversationsValue.toString(),
                            reach: insight.reach || '0',
                            cpm: insight.cpp || '0',
                            page_likes: pagelikesValue.toString(),
                            post_engagements: postEngagementsValue.toString(),
                            comments: commentsValue.toString(),
                            video_views: videoViewsValue.toString(),
                        }
                    };
                } catch (e: any) {
                    console.error(`[MetaAPI] Failed to fetch insights for campaign ${campaign.name} (${campaign.id}):`, e.message);
                    return {
                        id: campaign.id,
                        name: campaign.name,
                        status: campaign.status,
                        objective: campaign.objective
                    };
                }
            })
        );

        const totalConversations = campaignsWithInsights.reduce((sum, c: any) => sum + parseInt(c.insights?.conversations || '0'), 0);
        console.log(`[MetaAPI] Account ${accountId} total conversations aggregated: ${totalConversations}`);

        campaignsCache.set(cacheKey, { data: campaignsWithInsights, ts: Date.now() });
        return campaignsWithInsights;
    } catch (error) {
        console.error(`Error fetching campaigns for account ${accountId}:`, error);
        return [];
    }
}

export interface WeeklyDay {
    name: string;
    leads: number;
    spend: number;
    conversations: number;
}

const accountSummaryCache = new Map<string, { data: { leads24h: number; leadsMonth: number }; ts: number }>();
const accountDailyCache = new Map<string, { data: Record<number, number>; ts: number }>();

export async function getAccountDailyInsights(
    accountId: string,
    year: number,
    month: number,
    workspaceId?: string
): Promise<Record<number, number>> {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `${cleanId}_daily_${year}_${month}_${workspaceId}`;
    const cached = accountDailyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.data;

    try {
        const token = await getAccessToken(accountId, workspaceId);
        const since = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const until = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const url = `https://graph.facebook.com/v24.0/${cleanId}/insights?fields=actions,date_start&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.warn(`[MetaAPI] getAccountDailyInsights error for ${cleanId}:`, data.error.message);
            return {};
        }

        const LEAD_TYPES = ['lead'];
        const CONV_TYPES = ['onsite_conversion.messaging_conversation_started_7d'];
        const days: Record<number, number> = {};

        for (const row of data.data || []) {
            const day = new Date(row.date_start + 'T12:00:00').getDate();
            const actions: any[] = row.actions || [];
            const count = actions
                .filter((a: any) => LEAD_TYPES.includes(a.action_type) || CONV_TYPES.includes(a.action_type))
                .reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
            if (count > 0) days[day] = (days[day] || 0) + count;
        }

        accountDailyCache.set(cacheKey, { data: days, ts: Date.now() });
        return days;
    } catch (error) {
        console.error(`[MetaAPI] getAccountDailyInsights error for ${accountId}:`, error);
        return {};
    }
}

export async function getAccountLeadsSummary(
    accountId: string,
    workspaceId?: string
): Promise<{ leads24h: number; leadsMonth: number }> {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `${cleanId}_summary_${workspaceId}`;
    const cached = accountSummaryCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.data;

    try {
        const token = await getAccessToken(accountId, workspaceId);
        const LEAD_TYPES = ['lead'];
        const CONV_TYPES = ['onsite_conversion.messaging_conversation_started_7d'];

        const extractTotal = (resData: any, types: string[]) => {
            const actions: any[] = resData?.data?.[0]?.actions || [];
            return actions
                .filter((a: any) => types.includes(a.action_type))
                .reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
        };

        const [todayRes, monthRes] = await Promise.all([
            fetch(`https://graph.facebook.com/v24.0/${cleanId}/insights?fields=actions&date_preset=today&access_token=${token}`).then(r => r.json()),
            fetch(`https://graph.facebook.com/v24.0/${cleanId}/insights?fields=actions&date_preset=this_month&access_token=${token}`).then(r => r.json()),
        ]);

        if (todayRes.error) console.warn(`[MetaAPI] getAccountLeadsSummary today error for ${cleanId}:`, todayRes.error.message);
        if (monthRes.error) console.warn(`[MetaAPI] getAccountLeadsSummary month error for ${cleanId}:`, monthRes.error.message);

        const leads24h = extractTotal(todayRes, LEAD_TYPES) + extractTotal(todayRes, CONV_TYPES);
        const leadsMonth = extractTotal(monthRes, LEAD_TYPES) + extractTotal(monthRes, CONV_TYPES);

        const result = { leads24h, leadsMonth };
        accountSummaryCache.set(cacheKey, { data: result, ts: Date.now() });
        return result;
    } catch (error) {
        console.error(`[MetaAPI] getAccountLeadsSummary error for ${accountId}:`, error);
        return { leads24h: 0, leadsMonth: 0 };
    }
}

export async function getWeeklyBreakdown(accountId: string, workspaceId?: string): Promise<WeeklyDay[]> {
    try {
        const token = await getAccessToken(accountId, workspaceId);
        const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        const url = `https://graph.facebook.com/v24.0/${cleanId}/insights?fields=spend,actions,date_start&date_preset=last_7d&time_increment=1&access_token=${token}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('[MetaAPI] getWeeklyBreakdown error:', data.error);
            return [];
        }

        const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const LEAD_TYPES = ['lead', 'offsite_conversion.fb_pixel_lead'];
        const CONVERSATION_TYPES = ['onsite_conversion.messaging_conversation_started_7d'];

        return (data.data || []).map((row: any) => {
            const date = new Date(row.date_start + 'T12:00:00');
            const dayName = PT_DAYS[date.getDay()];

            let leads = 0;
            let conversations = 0;
            if (row.actions) {
                leads = row.actions
                    .filter((a: any) => LEAD_TYPES.includes(a.action_type))
                    .reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
                conversations = row.actions
                    .filter((a: any) => CONVERSATION_TYPES.includes(a.action_type))
                    .reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);
            }

            return { name: dayName, leads, spend: parseFloat(row.spend || '0'), conversations };
        });
    } catch (error) {
        console.error(`[MetaAPI] getWeeklyBreakdown error for ${accountId}:`, error);
        return [];
    }
}

export async function getTopCreatives(accountId: string, datePreset: string = 'last_30d', workspaceId?: string): Promise<MetaCreative[]> {
    try {
        const metaPreset = ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month', 'last_month', 'maximum'].includes(datePreset)
            ? datePreset
            : 'last_30d';

        const token = await getAccessToken(accountId, workspaceId);

        // Step 1: Fetch ads + insights only (no creative sub-fields to avoid API errors)
        const fields = [
            'name', 'status', 'effective_status', 'creative',
            `insights.date_preset(${metaPreset}){impressions,clicks,spend,ctr,actions}`
        ].join(',');
        const adsUrl = `https://graph.facebook.com/v19.0/${accountId}/ads?fields=${fields}&limit=100&access_token=${token}`;

        const adsResp = await fetch(adsUrl);
        const adsData = await adsResp.json();

        if (adsData.error) {
            console.error("[MetaAPI] Ads fetch failed:", JSON.stringify(adsData.error));
            return [];
        }

        const allAds: any[] = adsData.data || [];

        // Filter to ads with performance data in this period
        const adsWithData = allAds.filter((ad: any) => {
            const insight = ad.insights?.data?.[0];
            return insight && (parseInt(insight.impressions || '0') > 0 || parseFloat(insight.spend || '0') > 0);
        });

        if (adsWithData.length === 0) return [];

        // Sort by leads then spend, take top 12
        const topAds = adsWithData.sort((a: any, b: any) => {
            const getLeads = (ad: any) => {
                const actions = ad.insights?.data?.[0]?.actions || [];
                const la = actions.find((x: any) => x.action_type === 'lead' || x.action_type === 'onsite_conversion.lead_grouped');
                return parseInt(la?.value || '0');
            };
            const diff = getLeads(b) - getLeads(a);
            if (diff !== 0) return diff;
            return parseFloat(b.insights?.data?.[0]?.spend || '0') - parseFloat(a.insights?.data?.[0]?.spend || '0');
        }).slice(0, 12);

        // Step 2: Fetch creative details individually for each top ad
        // Individual fetch is used because batch /?ids= and inline creative{} both have field compatibility issues
        const creativeMap: Record<string, any> = {};
        await Promise.all(topAds.map(async (ad: any) => {
            const creativeId = ad.creative?.id;
            if (!creativeId) return;
            try {
                const url = `https://graph.facebook.com/v19.0/${creativeId}?fields=thumbnail_url,video_id,preview_shareable_link,object_story_spec&access_token=${token}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (!data.error) creativeMap[ad.id] = data;
            } catch {}
        }));

        // Build result
        return topAds.map((ad: any) => {
            const insight = ad.insights?.data?.[0] || {};
            const creative = creativeMap[ad.id] || {};

            // Media extraction with multiple fallbacks
            const spec = creative.object_story_spec || {};
            const videoId = creative.video_id || spec.video_data?.video_id || '';
            // Upgrade CDN thumbnail: remove stp size restriction to get full-size image
            const upgradeCdnUrl = (url: string) => {
                if (!url || !url.includes('fbcdn.net')) return url;
                try {
                    const u = new URL(url);
                    u.searchParams.delete('stp');
                    return u.toString();
                } catch { return url; }
            };

            // Use CDN thumbnail (scontent-*.fbcdn.net) — publicly accessible without auth
            // facebook.com/ads/image/ URLs require user to be logged in to Facebook
            const rawThumb =
                creative.thumbnail_url ||
                spec.video_data?.image_url ||
                spec.link_data?.picture ||
                spec.link_data?.image_url ||
                spec.link_data?.child_attachments?.[0]?.picture ||
                spec.link_data?.child_attachments?.[0]?.image_url ||
                spec.link_data?.child_attachments?.[0]?.thumbnail_url ||
                '';
            const thumbnail_url = upgradeCdnUrl(rawThumb);

            // Metrics
            const actions: any[] = insight.actions || [];
            const totalLeadAction = actions.find((a: any) =>
                a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
            );
            const totalLeadsValue = parseInt(totalLeadAction?.value || '0');
            const gtmAction = actions.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_lead');
            const leadsGTMValue = parseInt(gtmAction?.value || '0');
            const leadsMetaValue = Math.max(0, totalLeadsValue - leadsGTMValue);
            const salesValue = actions.filter((a: any) => a.action_type.includes('purchase'))
                .reduce((s: number, a: any) => s + parseInt(a.value || '0'), 0);
            const ctwaActions = actions.filter((a: any) => a.action_type.includes('messaging_conversation_started'));
            const conversationsValue = ctwaActions.length > 0
                ? ctwaActions.reduce((s: number, a: any) => s + parseInt(a.value || '0'), 0)
                : actions.filter((a: any) => a.action_type.includes('messaging_first_reply'))
                    .reduce((s: number, a: any) => s + parseInt(a.value || '0'), 0);

            return {
                id: ad.id,
                name: ad.name,
                status: ad.status,
                effective_status: ad.effective_status,
                thumbnail_url,
                preview_url: creative.preview_shareable_link || '',
                video_id: videoId || undefined,
                insights: {
                    impressions: insight.impressions || '0',
                    clicks: insight.clicks || '0',
                    spend: insight.spend || '0',
                    ctr: insight.ctr || '0',
                    leads: totalLeadsValue.toString(),
                    leads_form: leadsMetaValue.toString(),
                    leads_gtm: leadsGTMValue.toString(),
                    sales: salesValue.toString(),
                    conversations: conversationsValue.toString()
                }
            } as MetaCreative;
        });

    } catch (error) {
        console.error(`[MetaAPI] Fatal error in getTopCreatives:`, error);
        return [];
    }
}




// ... (existing interfaces and types)

// 4. PERSIST leads to database

/**
 * Robust helper to extract standard fields from Meta's lead field_data array.
 * Handles different naming conventions across forms/regions.
 */
export function extractLeadField(fieldData: any[], type: 'name' | 'email' | 'phone'): string {
    if (!fieldData || !Array.isArray(fieldData)) return '';

    const findField = (keys: string[]) => {
        for (const key of keys) {
            const field = fieldData.find((f: any) => {
                if (!f || !f.name) return false;
                const cleanName = f.name.toLowerCase().replace(/\s+/g, '_');
                return cleanName === key || f.name.toLowerCase() === key;
            });
            if (field?.values?.[0]) return field.values[0];
        }
        return '';
    };

    if (type === 'name') {
        // Try full name fields first
        const full = findField(['full_name', 'nome_completo', 'name', 'nome', 'whats_your_name']);
        if (full) return full;

        // Try to combine first and last name
        const first = findField(['first_name', 'primeiro_nome', 'firstname']);
        const last = findField(['last_name', 'sobrenome', 'lastname']);

        if (first || last) {
            return [first, last].filter(Boolean).join(' ');
        }
        return '';
    }

    if (type === 'email') {
        return findField(['email', 'e-mail', 'mail', 'work_email']);
    }

    if (type === 'phone') {
        return findField(['phone_number', 'telefone', 'phone', 'whatsapp', 'celular', 'mobile_number']);
    }

    return '';
}

function mapDbLeadToMetaLead(l: any): MetaLead {
    let baseData: any = {};
    if (l.raw_data) {
        try {
            baseData = JSON.parse(l.raw_data);
        } catch (e) {
            console.error("[MetaAPI] Error parsing raw_data:", (e as any).message);
        }
    }

    // Ensure field_data exists for the frontend (LeadsList.tsx Map)
    const field_data = baseData.field_data || [
        { name: 'full_name', values: [l.full_name || baseData.name || '-'] },
        { name: 'email', values: [l.email || baseData.email || '-'] },
        { name: 'phone', values: [l.phone || baseData.phone || '-'] }
    ];

    return {
        ...baseData,
        id: l.lead_id,
        created_time: l.created_time ? l.created_time.toISOString() : new Date().toISOString(),
        field_data,
        form_id: l.form_id || baseData.form_id || '',
        form_name: l.adset_name || baseData.form_name || (baseData.source === 'manual_entry' ? 'Cadastro Manual' : ''),
        ad_name: l.ad_name || baseData.ad_name || undefined,
        platform: l.platform || 'facebook',
    };
}

async function getLeadsFromDb(dbAccountId: string): Promise<MetaLead[]> {
    const testLeadFilter = {
        raw_data: {
            not: {
                contains: '"is_dummy":true'
            }
        }
    };

    const cachedLeads = await prisma.lead.findMany({
        where: {
            account_id: dbAccountId,
            ...testLeadFilter
        },
        orderBy: { created_time: 'desc' }
    });
    return cachedLeads.map(mapDbLeadToMetaLead);
}

export async function syncLeadsFromMeta(accountId: string) {
    // Normalize to act_ prefix
    const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    console.log(`[MetaAPI] Syncing leads from Meta for account: ${normalizedId}`);
    try {
        const token = await getAccessToken(normalizedId);

        // 1. Get or Create Ad Account DB record to have the internal UUID
        let dbAccount = await prisma.account.findUnique({
            where: { account_id: normalizedId }
        });

        if (!dbAccount) {
            console.warn(`[MetaAPI] Account ${normalizedId} not in DB â€” auto-creating it now...`);
            try {
                dbAccount = await prisma.account.create({
                    data: {
                        account_id: normalizedId,
                        account_name: normalizedId, // Will be corrected next time accounts are refreshed
                        currency: 'BRL',
                        account_status: 'ACTIVE',
                    }
                });
            } catch (createErr: any) {
                console.error(`[MetaAPI] Failed to auto-create account ${normalizedId}:`, createErr.message);
                return { success: false, error: 'Account not found and could not be created' };
            }
        }

        // Use normalizedId for all API calls
        accountId = normalizedId;

        // 2. Discover ALL Lead Forms in this account
        console.log(`[MetaAPI] Discovering lead forms for account ${accountId}`);
        let formIds = new Set<string>();

        try {
            let nextFormsUrl: string | null = `https://graph.facebook.com/v20.0/${dbAccount.account_id}/leadgen_forms?fields=id,name&limit=100&access_token=${token}`;

            while (nextFormsUrl) {
                const formsRes: any = await fetch(nextFormsUrl);
                const formsData: any = await formsRes.json();

                if (formsData.error) {
                    console.warn(`[MetaAPI] Error fetching forms for account ${accountId}:`, formsData.error.message);
                    break;
                }

                const forms = formsData.data || [];
                forms.forEach((f: any) => formIds.add(f.id));
                nextFormsUrl = formsData.paging?.next || null;
            }
        } catch (e: any) {
            console.error(`[MetaAPI] Exception in leadgen_forms fetch:`, e.message);
        }

        // Fallback: Still scan ads if no forms found via leadgen_forms (sometimes required)
        if (formIds.size === 0) {
            console.log(`[MetaAPI] No forms found via leadgen_forms, falling back to ad scan...`);
            try {
                const adsFields = 'id,name,creative{id,object_story_spec}';
                const adsUrl = `https://graph.facebook.com/v20.0/${dbAccount.account_id}/ads?fields=${adsFields}&limit=100&access_token=${token}`;
                const adsRes = await fetch(adsUrl);
                const adsData = await adsRes.json();

                if (!adsData.error && adsData.data) {
                    adsData.data.forEach((ad: any) => {
                        const spec = ad.creative?.object_story_spec;
                        if (spec?.link_data?.call_to_action?.value?.lead_gen_form_id) {
                            formIds.add(spec.link_data.call_to_action.value.lead_gen_form_id);
                        }
                        if (spec?.video_data?.call_to_action?.value?.lead_gen_form_id) {
                            formIds.add(spec.video_data.call_to_action.value.lead_gen_form_id);
                        }
                    });
                }
            } catch (e: any) {
                console.error(`[MetaAPI] Fallback ad scan failed:`, e.message);
            }
        }

        console.log(`[MetaAPI] Found total ${formIds.size} unique form IDs in account ${accountId}`);

        if (formIds.size === 0) {
            return { success: true, count: 0, message: 'No lead forms found' };
        }

        let totalUpserted = 0;

        // 3. For each form, fetch ALL leads
        for (const formId of Array.from(formIds)) {
            console.log(`[MetaAPI] Fetching leads for form: ${formId}`);
            let nextLeadsUrl: string | null = `https://graph.facebook.com/v20.0/${formId}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name&limit=100&access_token=${token}`;

            while (nextLeadsUrl) {
                const leadsRes: any = await fetch(nextLeadsUrl);
                const leadsData: any = await leadsRes.json();

                if (leadsData.error) {
                    console.error(`[MetaAPI] Error fetching leads for form ${formId}:`, leadsData.error.message);
                    break;
                }

                const leads = leadsData.data || [];
                console.log(`[MetaAPI] Received ${leads.length} leads from API for form ${formId}`);

                // 4. Save to DB
                for (const lead of leads) {
                    const fullName = extractLeadField(lead.field_data, 'name');
                    const email = extractLeadField(lead.field_data, 'email');
                    const phone = extractLeadField(lead.field_data, 'phone');

                    await prisma.lead.upsert({
                        where: { lead_id: lead.id },
                        update: {
                            account_id: dbAccount.id,
                            campaign_id: lead.campaign_id,
                            campaign_name: lead.campaign_name,
                            adset_id: lead.adset_id,
                            adset_name: lead.adset_name,
                            ad_id: lead.ad_id,
                            ad_name: lead.ad_name,
                            form_id: formId,
                            full_name: fullName,
                            email: email,
                            phone: phone,
                            raw_data: JSON.stringify(lead),
                            synced_at: new Date()
                        },
                        create: {
                            lead_id: lead.id,
                            account_id: dbAccount.id,
                            campaign_id: lead.campaign_id,
                            campaign_name: lead.campaign_name,
                            adset_id: lead.adset_id,
                            adset_name: lead.adset_name,
                            ad_id: lead.ad_id,
                            ad_name: lead.ad_name,
                            form_id: formId,
                            full_name: fullName,
                            email: email,
                            phone: phone,
                            created_time: new Date(lead.created_time),
                            raw_data: JSON.stringify(lead),
                            synced_at: new Date()
                        }
                    });
                    totalUpserted++;
                }

                nextLeadsUrl = leadsData.paging?.next || null;
            }
        }

        console.log(`[MetaAPI] Sync finished for ${accountId}. Total leads upserted: ${totalUpserted}`);
        return { success: true, count: totalUpserted };

    } catch (error: any) {
        console.error(`[MetaAPI] Sync failed for account ${accountId}:`, error.message);
        return { success: false, error: error.message };
    }
}

export async function getAllLeads(accountId: string, forceSync: boolean = false): Promise<MetaLead[]> {
    try {
        console.log(`[MetaAPI] getAllLeads called for ${accountId} (ForceSync: ${forceSync})`);

        // Try to find account by Meta account_id first (act_xxx format)
        const normalizedMetaId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        let dbAccount = await prisma.account.findUnique({
            where: { account_id: normalizedMetaId }
        });

        // Fallback: maybe accountId is the internal UUID (id field)
        if (!dbAccount && !accountId.startsWith('act_')) {
            dbAccount = await prisma.account.findUnique({
                where: { id: accountId }
            });
        }

        if (!dbAccount) {
            console.warn(`[MetaAPI] Account ${accountId} not found in DB (tried both account_id="${normalizedMetaId}" and id="${accountId}").`);
            // If sync requested, we still try â€” syncLeadsFromMeta will auto-create
            if (forceSync) {
                await syncLeadsFromMeta(normalizedMetaId);
                dbAccount = await prisma.account.findUnique({ where: { account_id: normalizedMetaId } });
                if (!dbAccount) return [];
            } else {
                return [];
            }
        }

        if (forceSync) {
            // Use the Meta account ID for syncing
            await syncLeadsFromMeta(dbAccount.account_id);
        }

        // Return leads from the database using internal UUID
        return await getLeadsFromDb(dbAccount.id);

    } catch (error) {
        console.error("[MetaAPI] Major error in getAllLeads:", error);
        return [];
    }
}

export async function debugLeadsFetch() {
    try {
        const firstAccount = await prisma.account.findFirst();
        if (!firstAccount) return [{ step: "Debug", msg: "No accounts found in DB" }];

        const res = await syncLeadsFromMeta(firstAccount.account_id);
        return [{
            step: "Sync Triggered",
            accountId: firstAccount.account_id,
            success: res.success,
            count: res.count
        }];
    } catch (e: any) {
        return [{ step: "Fatal Error", error: e.message }];
    }
}

/**
 * Automatically subscribes all managed pages to the app's webhooks.
 * This is called after a successful User OAuth login.
 */
export async function subscribePageToLeads(userAccessToken: string) {
    console.log("[MetaAPI] Starting automatic page subscription...");
    try {
        // 1. Get managed pages
        const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=100`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData.error) {
            throw new Error(`Failed to fetch pages: ${pagesData.error.message}`);
        }

        const pages = pagesData.data || [];
        console.log(`[MetaAPI] Found ${pages.length} pages to subscribe.`);

        const results = [];
        for (const page of pages) {
            try {
                console.log(`[MetaAPI] Subscribing page: ${page.name} (${page.id})`);
                // 2. Subscribe each page to 'leadgen' field
                const subUrl = `https://graph.facebook.com/v20.0/${page.id}/subscribed_apps?access_token=${page.access_token}&subscribed_fields=leadgen`;
                const subRes = await fetch(subUrl, { method: 'POST' });
                const subData = await subRes.json();

                if (subData.error) {
                    console.error(`[MetaAPI] Page ${page.name} subscription error:`, subData.error.message);
                }

                results.push({
                    page: page.name,
                    id: page.id,
                    success: !!subData.success,
                    error: subData.error?.message
                });
                console.log(`[MetaAPI] Page ${page.name} subscription result:`, subData.success ? 'SUCCESS' : 'FAILED');
            } catch (err: any) {
                console.error(`[MetaAPI] Exception subscribing page ${page.id}:`, err.message);
                results.push({ page: page.name, id: page.id, success: false, error: err.message });
            }
        }
        return results;
    } catch (error: any) {
        console.error("[MetaAPI] Fatal error in subscribePageToLeads:", error.message);
        throw error;
    }
}

/**
 * MAIN SYNC: Fetch leads from EVERY managed page using page access tokens.
 * This is the ONLY reliably working approach given the API permissions.
 */
export async function syncLeadsFromAllManagedPages() {
    console.log("[MetaAPI] Starting GLOBAL Page-Based Sync (v2)...");
    try {
        const userAccessToken = await getAccessToken();

        // STEP 1: Collect ALL managed pages with page access tokens (paginated)
        const allPages: any[] = [];
        let nextPagesUrl: string | null = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${userAccessToken}`;
        while (nextPagesUrl) {
            const res: any = await fetch(nextPagesUrl);
            const data: any = await res.json();
            if (data.error) { console.error("[MetaAPI] Pages fetch error:", data.error.message); break; }
            allPages.push(...(data.data || []));
            nextPagesUrl = data.paging?.next || null;
        }
        console.log(`[MetaAPI] Found ${allPages.length} managed pages.`);

        // STEP 2: Build a page_id -> dbAccount.id map by scanning ads in each account
        const pageToDbAccountMap: Record<string, string> = {};
        const dbAccounts = await prisma.account.findMany();
        for (const dbAcc of dbAccounts) {
            try {
                const adsRes: any = await fetch(
                    `https://graph.facebook.com/v20.0/${dbAcc.account_id}/ads?fields=creative{object_story_spec}&limit=50&access_token=${userAccessToken}`
                );
                const adsData: any = await adsRes.json();
                if (!adsData.error && adsData.data) {
                    for (const ad of adsData.data) {
                        const pageId = ad.creative?.object_story_spec?.page_id;
                        if (pageId && !pageToDbAccountMap[pageId]) {
                            pageToDbAccountMap[pageId] = dbAcc.id;
                        }
                    }
                }
            } catch (e) { /* skip */ }
        }
        console.log(`[MetaAPI] Built page-to-account map with ${Object.keys(pageToDbAccountMap).length} entries.`);

        let totalUpserted = 0;

        // STEP 3: For each page, fetch all forms and their leads
        for (const page of allPages) {
            const dbAccountId = pageToDbAccountMap[page.id];
            let nextFormsUrl: string | null = `https://graph.facebook.com/v20.0/${page.id}/leadgen_forms?fields=id,name&limit=100&access_token=${page.access_token}`;

            while (nextFormsUrl) {
                const formsRes: any = await fetch(nextFormsUrl);
                const formsData: any = await formsRes.json();
                if (formsData.error) { break; }
                const forms = formsData.data || [];

                for (const form of forms) {
                    let nextLeadsUrl: string | null = `https://graph.facebook.com/v20.0/${form.id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name&limit=100&access_token=${page.access_token}`;
                    while (nextLeadsUrl) {
                        const leadsRes: any = await fetch(nextLeadsUrl);
                        const leadsData: any = await leadsRes.json();
                        if (leadsData.error) { break; }

                        for (const lead of leadsData.data || []) {
                            let accountId: string | undefined = dbAccountId;
                            if (!accountId && lead.campaign_id) {
                                const campaign = await prisma.campaign.findUnique({
                                    where: { campaign_id: lead.campaign_id },
                                    select: { account_id: true }
                                });
                                accountId = campaign?.account_id;
                            }
                            if (!accountId) { continue; }

                            const fullName = extractLeadField(lead.field_data, 'name');
                            const email = extractLeadField(lead.field_data, 'email');
                            const phone = extractLeadField(lead.field_data, 'phone');

                            try {
                                await prisma.lead.upsert({
                                    where: { lead_id: lead.id },
                                    update: {
                                        account_id: accountId, campaign_id: lead.campaign_id,
                                        campaign_name: lead.campaign_name, adset_id: lead.adset_id,
                                        adset_name: lead.adset_name, ad_id: lead.ad_id,
                                        ad_name: lead.ad_name, form_id: form.id,
                                        full_name: fullName, email, phone,
                                        raw_data: JSON.stringify(lead), synced_at: new Date()
                                    },
                                    create: {
                                        lead_id: lead.id, account_id: accountId,
                                        campaign_id: lead.campaign_id, campaign_name: lead.campaign_name,
                                        adset_id: lead.adset_id, adset_name: lead.adset_name,
                                        ad_id: lead.ad_id, ad_name: lead.ad_name, form_id: form.id,
                                        full_name: fullName, email, phone,
                                        created_time: new Date(lead.created_time),
                                        raw_data: JSON.stringify(lead), synced_at: new Date()
                                    }
                                });
                                totalUpserted++;
                            } catch (e: any) {
                                console.error(`[MetaAPI] Upsert lead ${lead.id} failed:`, e.message);
                            }
                        }
                        nextLeadsUrl = leadsData.paging?.next || null;
                    }
                }
                nextFormsUrl = formsData.paging?.next || null;
            }
        }
        console.log(`[MetaAPI] Page sync complete. Total leads upserted: ${totalUpserted}`);
        return { success: true, count: totalUpserted };
    } catch (e: any) {
        console.error("[MetaAPI] syncLeadsFromAllManagedPages failed:", e.message);
        return { success: false, error: e.message };
    }
}


