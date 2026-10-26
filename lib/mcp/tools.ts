import { prisma } from "@/lib/prisma";
import { getCampaigns, getTopCreatives, updateObjectStatus, calculateAvailableBalance, type MetaAdAccount, type MetaCampaign } from "@/lib/meta-api";
import { resolveMetaAccounts } from "@/lib/meta-accounts";
import {
    formatCustomerId,
    getGoogleAdsCampaigns,
    getGoogleAdsDaily,
    getGoogleAdsSummary,
    getWorkspaceGoogleAccount,
    searchGaql,
    setGoogleAdsCampaignStatus,
} from "@/lib/google-ads";
import type { McpAuthContext } from "./oauth";

/**
 * Tools exposed to Claude over MCP. Every handler is scoped to the workspace and user of
 * the OAuth grant — account ids coming from the model are always checked against the
 * accounts that user can see in the dashboard.
 */

type JsonSchema = Record<string, unknown>;

export interface ToolDefinition {
    name: string;
    title: string;
    description: string;
    scope: "ads:read" | "leads:read" | "ads:write";
    inputSchema: JsonSchema;
    annotations: {
        readOnlyHint: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
    };
    handler: (args: Record<string, any>, ctx: McpAuthContext) => Promise<unknown>;
}

export class ToolInputError extends Error {}

/* ------------------------------------------------------------------ *
 *  Dates (America/Sao_Paulo)                                          *
 * ------------------------------------------------------------------ */

const DATE_PRESETS = ["today", "yesterday", "last_7d", "last_14d", "last_30d", "last_90d", "this_month", "last_month", "maximum"] as const;
type DatePreset = typeof DATE_PRESETS[number];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayBRT(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function shiftDays(isoDate: string, days: number): string {
    const d = new Date(`${isoDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

interface ResolvedRange {
    /** value accepted by lib/meta-api (native preset or custom:YYYY-MM-DD:YYYY-MM-DD) */
    metaPreset: string;
    start: string;
    end: string;
}

/** Same semantics as Meta's presets: last_N_d are the N complete days before today. */
function resolveRange(args: Record<string, any>): ResolvedRange {
    const { start_date, end_date } = args;
    if (start_date || end_date) {
        if (!DATE_RE.test(start_date ?? "") || !DATE_RE.test(end_date ?? "")) {
            throw new ToolInputError("Informe start_date e end_date juntos, no formato AAAA-MM-DD.");
        }
        const [start, end] = start_date <= end_date ? [start_date, end_date] : [end_date, start_date];
        return { metaPreset: `custom:${start}:${end}`, start, end };
    }

    const preset: DatePreset = args.date_preset ?? "last_30d";
    if (!DATE_PRESETS.includes(preset)) throw new ToolInputError(`date_preset inválido. Use: ${DATE_PRESETS.join(", ")}.`);

    const today = todayBRT();
    const [y, m] = today.split("-").map(Number);
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    const range: Record<DatePreset, [string, string]> = {
        today: [today, today],
        yesterday: [shiftDays(today, -1), shiftDays(today, -1)],
        last_7d: [shiftDays(today, -7), shiftDays(today, -1)],
        last_14d: [shiftDays(today, -14), shiftDays(today, -1)],
        last_30d: [shiftDays(today, -30), shiftDays(today, -1)],
        last_90d: [shiftDays(today, -90), shiftDays(today, -1)],
        this_month: [firstOfMonth, today],
        last_month: [`${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-01`, shiftDays(firstOfMonth, -1)],
        maximum: ["2015-01-01", today],
    };
    const [start, end] = range[preset];
    return { metaPreset: preset, start, end };
}

const DATE_RANGE_PROPS: JsonSchema = {
    date_preset: {
        type: "string",
        enum: [...DATE_PRESETS],
        description: "Período relativo (fuso de Brasília). last_7d/last_30d excluem hoje. Padrão: last_30d. Ignorado se start_date/end_date forem enviados.",
    },
    start_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Início do período (AAAA-MM-DD). Use junto com end_date." },
    end_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Fim do período, inclusivo (AAAA-MM-DD)." },
};

/* ------------------------------------------------------------------ *
 *  Account access                                                     *
 * ------------------------------------------------------------------ */

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function visibleMetaAccounts(ctx: McpAuthContext): Promise<MetaAdAccount[]> {
    const accounts = await resolveMetaAccounts({
        workspaceId: ctx.workspaceId,
        isSuperAdmin: ctx.isSuperAdmin,
        getAllowedAccountIds: async () => ctx.allowedAccountIds,
    });
    const allowed = ctx.allowedAccountIds;
    return allowed ? accounts.filter(a => allowed.includes(a.id) || allowed.includes(a.account_id ?? "")) : accounts;
}

async function requireMetaAccount(ctx: McpAuthContext, rawId: unknown): Promise<MetaAdAccount> {
    if (typeof rawId !== "string" || !rawId.trim()) throw new ToolInputError("account_id é obrigatório (ex: act_123456789).");
    const id = rawId.trim().startsWith("act_") ? rawId.trim() : `act_${rawId.trim().replace(/\D/g, "")}`;
    const account = (await visibleMetaAccounts(ctx)).find(a => a.id === id);
    if (!account) throw new ToolInputError(`Conta Meta ${id} não encontrada ou sem acesso. Use list_ad_accounts para ver as contas disponíveis.`);
    return account;
}

async function visibleGoogleAccounts(ctx: McpAuthContext) {
    return prisma.googleAdsAccount.findMany({
        where: { workspace_id: ctx.workspaceId, is_hidden: false },
        orderBy: { descriptive_name: "asc" },
    });
}

async function requireGoogleAccount(ctx: McpAuthContext, rawId: unknown) {
    if (typeof rawId !== "string" || !rawId.trim()) throw new ToolInputError("customer_id é obrigatório (ex: 123-456-7890).");
    try {
        return await getWorkspaceGoogleAccount(ctx.workspaceId, rawId);
    } catch {
        throw new ToolInputError(`Conta Google Ads ${rawId} não encontrada. Use list_ad_accounts para ver as contas disponíveis.`);
    }
}

const META_STATUS: Record<number, string> = {
    1: "ACTIVE", 2: "DISABLED", 3: "UNSETTLED", 7: "PENDING_RISK_REVIEW", 8: "PENDING_SETTLEMENT",
    9: "IN_GRACE_PERIOD", 100: "PENDING_CLOSURE", 101: "CLOSED", 201: "ANY_ACTIVE", 202: "ANY_CLOSED",
};

/* ------------------------------------------------------------------ *
 *  Meta metrics shaping                                               *
 * ------------------------------------------------------------------ */

function metaCampaignMetrics(c: MetaCampaign) {
    const i = c.insights;
    const n = (v?: string) => Number(v ?? 0) || 0;
    const spend = n(i?.spend);
    const clicks = n(i?.clicks);
    const impressions = n(i?.impressions);
    const leadsForm = n(i?.leads_form);
    const leadsSite = n(i?.leads_gtm);
    const conversations = n(i?.conversations);
    const purchases = n(i?.sales);
    const purchaseValue = n(i?.purchase_value);
    return {
        spend, impressions, clicks, reach: n(i?.reach),
        leads_form: leadsForm, leads_site: leadsSite, conversations, purchases, purchase_value: purchaseValue,
    };
}

type MetaMetrics = ReturnType<typeof metaCampaignMetrics>;

function deriveMeta(m: MetaMetrics) {
    const leads = m.leads_form + m.leads_site;
    return {
        ...m,
        spend: round(m.spend),
        purchase_value: round(m.purchase_value),
        ctr_percent: m.impressions > 0 ? round((m.clicks / m.impressions) * 100) : 0,
        cpc: m.clicks > 0 ? round(m.spend / m.clicks) : null,
        cpm: m.impressions > 0 ? round((m.spend / m.impressions) * 1000) : null,
        cost_per_lead: leads > 0 ? round(m.spend / leads) : null,
        cost_per_conversation: m.conversations > 0 ? round(m.spend / m.conversations) : null,
        cost_per_purchase: m.purchases > 0 ? round(m.spend / m.purchases) : null,
        roas: m.spend > 0 && m.purchase_value > 0 ? round(m.purchase_value / m.spend) : null,
    };
}

function sumMeta(list: MetaMetrics[]): MetaMetrics {
    return list.reduce((a, m) => ({
        spend: a.spend + m.spend, impressions: a.impressions + m.impressions, clicks: a.clicks + m.clicks,
        // Campaign reach overlaps, so the sum is an upper bound — reported as such
        reach: a.reach + m.reach,
        leads_form: a.leads_form + m.leads_form, leads_site: a.leads_site + m.leads_site,
        conversations: a.conversations + m.conversations, purchases: a.purchases + m.purchases,
        purchase_value: a.purchase_value + m.purchase_value,
    }), { spend: 0, impressions: 0, clicks: 0, reach: 0, leads_form: 0, leads_site: 0, conversations: 0, purchases: 0, purchase_value: 0 });
}

function roundGoogle<T extends Record<string, any>>(m: T): T {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(m)) out[k] = typeof v === "number" ? round(v) : v;
    return out as T;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    }));
    return results;
}

/* ------------------------------------------------------------------ *
 *  Tools                                                              *
 * ------------------------------------------------------------------ */

export const TOOLS: ToolDefinition[] = [
    {
        name: "get_workspace_info",
        title: "Informações do workspace",
        description: "Retorna o workspace e o usuário conectados, quais plataformas estão integradas (Meta Ads, Google Ads) e as permissões concedidas a esta conexão. Use primeiro para se orientar.",
        scope: "ads:read",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, openWorldHint: false },
        handler: async (_args, ctx) => {
            const [workspace, google, metaCount] = await Promise.all([
                prisma.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { nome_empresa: true, meta_access_token: true } }),
                prisma.googleAdsConnection.findUnique({ where: { workspace_id: ctx.workspaceId }, select: { google_email: true, last_error: true } }),
                prisma.account.count({ where: { workspace_id: ctx.workspaceId, is_hidden: false } }),
            ]);
            return {
                workspace: workspace?.nome_empresa ?? null,
                user: ctx.userEmail,
                timezone: "America/Sao_Paulo",
                today: todayBRT(),
                platforms: {
                    meta_ads: { connected: !!workspace?.meta_access_token || metaCount > 0, linked_accounts: metaCount },
                    google_ads: { connected: !!google, google_email: google?.google_email ?? null, problem: google?.last_error ?? null },
                },
                granted_scopes: ctx.scopes,
                account_restrictions: ctx.allowedAccountIds ? "Este usuário só enxerga as contas liberadas pelo administrador." : null,
            };
        },
    },
    {
        name: "list_ad_accounts",
        title: "Listar contas de anúncio",
        description: "Lista as contas de anúncio acessíveis: Meta Ads (id no formato act_123..., saldo disponível, status) e Google Ads (customer_id 123-456-7890, moeda, fuso). Os ids retornados são os que as outras ferramentas aceitam.",
        scope: "ads:read",
        inputSchema: {
            type: "object",
            properties: { platform: { type: "string", enum: ["all", "meta", "google"], description: "Filtrar por plataforma. Padrão: all." } },
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const platform = args.platform ?? "all";
            const result: Record<string, unknown> = {};
            if (platform !== "google") {
                try {
                    const accounts = await visibleMetaAccounts(ctx);
                    result.meta_ads = accounts.map(a => ({
                        account_id: a.id,
                        name: a.name,
                        currency: a.currency,
                        status: META_STATUS[a.account_status] ?? String(a.account_status),
                        payment: a.is_prepay_account ? "pré-pago" : "cartão/fatura",
                        available_balance: round(calculateAvailableBalance(a)),
                    }));
                } catch (err: any) {
                    result.meta_ads_error = err.message;
                }
            }
            if (platform !== "meta") {
                const accounts = await visibleGoogleAccounts(ctx);
                result.google_ads = accounts.map(a => ({
                    customer_id: formatCustomerId(a.customer_id),
                    name: a.descriptive_name,
                    currency: a.currency_code,
                    time_zone: a.time_zone,
                    via_manager: a.login_customer_id ? formatCustomerId(a.login_customer_id) : null,
                }));
            }
            return result;
        },
    },
    {
        name: "get_meta_ads_performance",
        title: "Performance Meta Ads",
        description: "Métricas de uma conta Meta Ads no período: totais (investimento, impressões, cliques, CTR, CPC, CPM, leads de formulário e de site, conversas no WhatsApp/Messenger, compras, ROAS, custo por resultado) e o detalhamento por campanha, ordenado por investimento.",
        scope: "ads:read",
        inputSchema: {
            type: "object",
            properties: {
                account_id: { type: "string", description: "Id da conta Meta (act_123456789)." },
                ...DATE_RANGE_PROPS,
                campaign_status: { type: "string", enum: ["all", "active"], description: "active = só campanhas ativas. Padrão: all." },
                include_campaigns: { type: "boolean", description: "Incluir lista de campanhas (máx. 50). Padrão: true." },
            },
            required: ["account_id"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const account = await requireMetaAccount(ctx, args.account_id);
            const range = resolveRange(args);
            let campaigns = await getCampaigns(account.id, range.metaPreset, ctx.workspaceId);
            if (args.campaign_status === "active") campaigns = campaigns.filter(c => c.status === "ACTIVE");
            const rows = campaigns.map(c => ({ c, m: metaCampaignMetrics(c) }));
            const totals = deriveMeta(sumMeta(rows.map(r => r.m)));
            return {
                account: { account_id: account.id, name: account.name, currency: account.currency },
                period: { start: range.start, end: range.end },
                totals: { ...totals, reach_note: "soma do alcance das campanhas (pode contar a mesma pessoa mais de uma vez)" },
                campaigns: args.include_campaigns === false ? undefined : rows
                    .sort((a, b) => b.m.spend - a.m.spend)
                    .slice(0, 50)
                    .map(({ c, m }) => ({ campaign_id: c.id, name: c.name, status: c.status, objective: c.objective, end_time: c.end_time ?? null, ...deriveMeta(m) })),
                campaigns_total: campaigns.length,
            };
        },
    },
    {
        name: "get_meta_top_creatives",
        title: "Melhores criativos Meta",
        description: "Anúncios (criativos) de uma conta Meta com métricas no período, ordenados por investimento — útil para descobrir quais criativos performam melhor. Aceita apenas períodos relativos (date_preset).",
        scope: "ads:read",
        inputSchema: {
            type: "object",
            properties: {
                account_id: { type: "string", description: "Id da conta Meta (act_123456789)." },
                date_preset: { type: "string", enum: DATE_PRESETS.filter(p => p !== "maximum"), description: "Padrão: last_30d." },
                limit: { type: "integer", minimum: 1, maximum: 50, description: "Máximo de anúncios. Padrão: 15." },
            },
            required: ["account_id"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const account = await requireMetaAccount(ctx, args.account_id);
            const preset = args.date_preset ?? "last_30d";
            const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);
            const creatives = await getTopCreatives(account.id, preset, ctx.workspaceId);
            const n = (v?: string) => Number(v ?? 0) || 0;
            return {
                account: { account_id: account.id, name: account.name },
                date_preset: preset,
                ads: creatives
                    .map(c => {
                        const spend = n(c.insights?.spend);
                        const leads = n(c.insights?.leads_form) + n(c.insights?.leads_gtm);
                        const conversations = n(c.insights?.conversations);
                        return {
                            ad_id: c.id, name: c.name, campaign: c.campaign_name ?? null, status: c.effective_status ?? c.status,
                            spend: round(spend), impressions: n(c.insights?.impressions), clicks: n(c.insights?.clicks),
                            ctr_percent: round(n(c.insights?.ctr)), leads, conversations, purchases: n(c.insights?.sales),
                            cost_per_lead: leads > 0 ? round(spend / leads) : null,
                            cost_per_conversation: conversations > 0 ? round(spend / conversations) : null,
                            preview_url: c.preview_url ?? null,
                        };
                    })
                    .sort((a, b) => b.spend - a.spend)
                    .slice(0, limit),
            };
        },
    },
    {
        name: "get_google_ads_performance",
        title: "Performance Google Ads",
        description: "Métricas de uma conta Google Ads no período: totais (investimento, impressões, cliques, CTR, CPC médio, conversões, custo por conversão, valor de conversão, ROAS), campanhas ordenadas por investimento e, opcionalmente, a série diária.",
        scope: "ads:read",
        inputSchema: {
            type: "object",
            properties: {
                customer_id: { type: "string", description: "Id da conta Google Ads (123-456-7890 ou 1234567890)." },
                ...DATE_RANGE_PROPS,
                include_campaigns: { type: "boolean", description: "Incluir campanhas (máx. 50). Padrão: true." },
                include_daily: { type: "boolean", description: "Incluir série diária. Padrão: false." },
            },
            required: ["customer_id"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const account = await requireGoogleAccount(ctx, args.customer_id);
            const range = resolveRange(args);
            const base = [ctx.workspaceId, account.customer_id, range.start, range.end, account.login_customer_id] as const;
            const [summary, campaigns, daily] = await Promise.all([
                getGoogleAdsSummary(...base),
                args.include_campaigns === false ? Promise.resolve(null) : getGoogleAdsCampaigns(...base),
                args.include_daily ? getGoogleAdsDaily(...base) : Promise.resolve(null),
            ]);
            return {
                account: { customer_id: formatCustomerId(account.customer_id), name: account.descriptive_name, currency: account.currency_code },
                period: { start: range.start, end: range.end },
                totals: { ...roundGoogle(summary), ctr_percent: round(summary.ctr) },
                campaigns: campaigns?.slice(0, 50).map(c => ({ campaign_id: c.id, ...roundGoogle(c) })),
                campaigns_total: campaigns?.length,
                daily: daily?.map(roundGoogle),
            };
        },
    },
    {
        name: "run_google_ads_query",
        title: "Consulta GAQL no Google Ads",
        description: "Executa uma consulta somente leitura em Google Ads Query Language (GAQL) numa conta, para análises que as outras ferramentas não cobrem (palavras-chave, termos de pesquisa, grupos de anúncios, dispositivos, geografia...). Ex: SELECT ad_group.name, metrics.clicks FROM ad_group WHERE segments.date DURING LAST_7_DAYS. Valores *_micros devem ser divididos por 1.000.000. Retorna no máximo 500 linhas.",
        scope: "ads:read",
        inputSchema: {
            type: "object",
            properties: {
                customer_id: { type: "string", description: "Id da conta Google Ads." },
                query: { type: "string", description: "Consulta GAQL começando com SELECT." },
            },
            required: ["customer_id", "query"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const account = await requireGoogleAccount(ctx, args.customer_id);
            const query = String(args.query ?? "").trim();
            if (!/^select\s/i.test(query)) throw new ToolInputError("A consulta deve começar com SELECT.");
            const rows = await searchGaql(ctx.workspaceId, account.customer_id, query, account.login_customer_id);
            return { customer_id: formatCustomerId(account.customer_id), row_count: rows.length, truncated: rows.length > 500, rows: rows.slice(0, 500) };
        },
    },
    {
        name: "get_cross_platform_summary",
        title: "Resumo Meta + Google",
        description: "Investimento e resultados de todas as contas (Meta Ads e Google Ads) no período, por conta e somados por plataforma. Ideal para visão consolidada e comparação entre canais. Pode levar alguns segundos com muitas contas.",
        scope: "ads:read",
        inputSchema: { type: "object", properties: { ...DATE_RANGE_PROPS }, additionalProperties: false },
        annotations: { readOnlyHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const range = resolveRange(args);
            const MAX_ACCOUNTS = 40;
            const [metaAccounts, googleAccounts] = await Promise.all([
                visibleMetaAccounts(ctx).catch(() => [] as MetaAdAccount[]),
                visibleGoogleAccounts(ctx),
            ]);

            const meta = await mapLimit(metaAccounts.slice(0, MAX_ACCOUNTS), 4, async a => {
                try {
                    const m = deriveMeta(sumMeta((await getCampaigns(a.id, range.metaPreset, ctx.workspaceId)).map(metaCampaignMetrics)));
                    return { account_id: a.id, name: a.name, currency: a.currency, spend: m.spend, leads: m.leads_form + m.leads_site, conversations: m.conversations, purchases: m.purchases, purchase_value: m.purchase_value };
                } catch (err: any) {
                    return { account_id: a.id, name: a.name, error: err.message };
                }
            });
            const google = await mapLimit(googleAccounts.slice(0, MAX_ACCOUNTS), 4, async a => {
                try {
                    const s = await getGoogleAdsSummary(ctx.workspaceId, a.customer_id, range.start, range.end, a.login_customer_id);
                    return { customer_id: formatCustomerId(a.customer_id), name: a.descriptive_name, currency: a.currency_code, spend: round(s.cost), clicks: s.clicks, conversions: round(s.conversions), conversions_value: round(s.conversions_value) };
                } catch (err: any) {
                    return { customer_id: formatCustomerId(a.customer_id), name: a.descriptive_name, error: err.message };
                }
            });

            const total = (rows: any[], key: string) => round(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));
            return {
                period: { start: range.start, end: range.end },
                note: "Totais somam moedas diferentes se houver contas em moedas distintas.",
                meta_ads: { total_spend: total(meta, "spend"), total_leads: total(meta, "leads"), total_conversations: total(meta, "conversations"), total_purchases: total(meta, "purchases"), accounts: meta },
                google_ads: { total_spend: total(google, "spend"), total_conversions: total(google, "conversions"), total_conversions_value: total(google, "conversions_value"), accounts: google },
                truncated: metaAccounts.length > MAX_ACCOUNTS || googleAccounts.length > MAX_ACCOUNTS,
            };
        },
    },
    {
        name: "list_leads",
        title: "Listar leads",
        description: "Lista leads capturados (formulários Meta, webhooks e cadastros manuais) das contas que o usuário pode ver, do mais recente para o mais antigo. Filtros opcionais por conta, status, data e texto.",
        scope: "leads:read",
        inputSchema: {
            type: "object",
            properties: {
                account_id: { type: "string", description: "Filtrar por conta Meta (act_123...)." },
                status: { type: "string", description: "Status do lead no CRM (ex: novo, contatado, convertido)." },
                since: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Somente leads criados a partir desta data (AAAA-MM-DD)." },
                search: { type: "string", description: "Busca em nome, e-mail, telefone ou campanha." },
                limit: { type: "integer", minimum: 1, maximum: 200, description: "Padrão: 50." },
            },
            additionalProperties: false,
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
        handler: async (args, ctx) => {
            const accounts = await visibleMetaAccounts(ctx);
            let accountIds = accounts.map(a => a.id);
            if (args.account_id) {
                const account = await requireMetaAccount(ctx, args.account_id);
                accountIds = [account.id];
            }
            if (args.since && !DATE_RE.test(args.since)) throw new ToolInputError("since deve estar no formato AAAA-MM-DD.");
            const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
            const q = typeof args.search === "string" ? args.search.trim() : "";

            const leads = await prisma.lead.findMany({
                where: {
                    account: { account_id: { in: accountIds } },
                    ...(args.status ? { status: String(args.status) } : {}),
                    ...(args.since ? { created_time: { gte: new Date(`${args.since}T00:00:00-03:00`) } } : {}),
                    ...(q ? {
                        OR: [
                            { full_name: { contains: q, mode: "insensitive" as const } },
                            { email: { contains: q, mode: "insensitive" as const } },
                            { phone: { contains: q } },
                            { campaign_name: { contains: q, mode: "insensitive" as const } },
                        ],
                    } : {}),
                },
                orderBy: { created_time: "desc" },
                take: limit,
                include: { account: { select: { account_id: true, account_name: true } } },
            });
            return {
                count: leads.length,
                leads: leads.map(l => ({
                    name: l.full_name, email: l.email, phone: l.phone, status: l.status, notes: l.notes,
                    created_time: l.created_time.toISOString(), platform: l.platform,
                    account: l.account ? { account_id: l.account.account_id, name: l.account.account_name } : null,
                    campaign: l.campaign_name, ad_set: l.adset_name, ad: l.ad_name, form_id: l.form_id,
                })),
            };
        },
    },
    {
        name: "update_campaign_status",
        title: "Pausar ou ativar campanha",
        description: "Pausa ou reativa uma campanha no Meta Ads ou no Google Ads. Afeta a veiculação e o gasto real — confirme com o usuário antes de usar.",
        scope: "ads:write",
        inputSchema: {
            type: "object",
            properties: {
                platform: { type: "string", enum: ["meta", "google"] },
                account_id: { type: "string", description: "Conta Meta (act_...) ou customer_id do Google Ads." },
                campaign_id: { type: "string", description: "Id da campanha (veja get_meta_ads_performance / get_google_ads_performance)." },
                status: { type: "string", enum: ["active", "paused"] },
            },
            required: ["platform", "account_id", "campaign_id", "status"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
        handler: async (args, ctx) => {
            const campaignId = String(args.campaign_id ?? "").trim();
            if (!/^\d+$/.test(campaignId)) throw new ToolInputError("campaign_id deve conter apenas dígitos.");
            if (args.status !== "active" && args.status !== "paused") throw new ToolInputError("status deve ser active ou paused.");

            if (args.platform === "meta") {
                const account = await requireMetaAccount(ctx, args.account_id);
                // The token may reach campaigns of other accounts — only touch this account's
                const campaigns = await getCampaigns(account.id, "today", ctx.workspaceId);
                const campaign = campaigns.find(c => c.id === campaignId);
                if (!campaign) throw new ToolInputError(`Campanha ${campaignId} não pertence à conta ${account.id}.`);
                const status = args.status === "active" ? "ACTIVE" : "PAUSED";
                const res = await updateObjectStatus(campaignId, status, account.id, ctx.workspaceId);
                if (!res.success) throw new Error(res.error ?? "Falha ao alterar status na Meta.");
                return { platform: "meta", account_id: account.id, campaign_id: campaignId, campaign: campaign.name, new_status: status };
            }
            if (args.platform === "google") {
                const account = await requireGoogleAccount(ctx, args.account_id);
                const status = args.status === "active" ? "ENABLED" : "PAUSED";
                await setGoogleAdsCampaignStatus(ctx.workspaceId, account.customer_id, campaignId, status, account.login_customer_id);
                return { platform: "google", customer_id: formatCustomerId(account.customer_id), campaign_id: campaignId, new_status: status };
            }
            throw new ToolInputError("platform deve ser meta ou google.");
        },
    },
];

export function toolsForScopes(scopes: string[]): ToolDefinition[] {
    return TOOLS.filter(t => scopes.includes(t.scope));
}
