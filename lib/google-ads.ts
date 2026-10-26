import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * Google Ads API over REST (no client library). Docs:
 * https://developers.google.com/google-ads/api/rest/overview
 *
 * Env:
 *   GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET — OAuth client (Google Cloud, "Web application")
 *   GOOGLE_ADS_DEVELOPER_TOKEN — from the Google Ads manager account (Tools → API Center)
 *   GOOGLE_ADS_API_VERSION — defaults to v26; each major version is supported for ~1 year
 */

const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v26";
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

export class GoogleAdsError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
        super(message);
        this.name = "GoogleAdsError";
    }
}

export function getGoogleAdsConfigStatus() {
    return {
        clientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
        clientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
        developerToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        apiVersion: API_VERSION,
    };
}

export function isGoogleAdsConfigured(): boolean {
    const s = getGoogleAdsConfigStatus();
    return s.clientId && s.clientSecret && s.developerToken;
}

/** "123-456-7890" / "customers/1234567890" → "1234567890" */
export function normalizeCustomerId(id: string): string {
    return id.replace(/^customers\//, "").replace(/\D/g, "");
}

export function formatCustomerId(id: string): string {
    const d = normalizeCustomerId(id);
    return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d;
}

/* ------------------------------------------------------------------ *
 *  OAuth                                                              *
 * ------------------------------------------------------------------ */

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: `${GOOGLE_ADS_SCOPE} openid email`,
        // offline + consent guarantees a refresh_token even on re-connects
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function postToken(body: Record<string, string>) {
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
            ...body,
        }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
        throw new GoogleAdsError(json.error_description || json.error || `Falha no OAuth do Google (${res.status})`, res.status, json.error);
    }
    return json as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string; scope?: string };
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
    const tokens = await postToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
    let email: string | null = null;
    if (tokens.id_token) {
        // Received directly from Google over TLS — decoding without verifying is fine for display
        try {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString("utf8"));
            email = payload.email ?? null;
        } catch { /* email is cosmetic */ }
    }
    return { ...tokens, email };
}

/** Returns a valid access token for the workspace, refreshing (and persisting) it when needed. */
export async function getGoogleAccessToken(workspaceId: string): Promise<string> {
    const conn = await prisma.googleAdsConnection.findUnique({ where: { workspace_id: workspaceId } });
    if (!conn) throw new GoogleAdsError("Google Ads não está conectado neste workspace.", 400, "NOT_CONNECTED");

    const stillValid = conn.access_token && conn.access_token_expires_at
        && conn.access_token_expires_at.getTime() - Date.now() > 60_000;
    if (stillValid) return decryptSecret(conn.access_token!);

    try {
        const tokens = await postToken({ grant_type: "refresh_token", refresh_token: decryptSecret(conn.refresh_token) });
        await prisma.googleAdsConnection.update({
            where: { workspace_id: workspaceId },
            data: {
                access_token: encryptSecret(tokens.access_token),
                access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
                last_error: null,
            },
        });
        return tokens.access_token;
    } catch (err) {
        const e = err as GoogleAdsError;
        if (e.code === "invalid_grant") {
            const msg = "A autorização do Google expirou ou foi revogada. Reconecte o Google Ads.";
            await prisma.googleAdsConnection.update({ where: { workspace_id: workspaceId }, data: { last_error: msg } }).catch(() => {});
            throw new GoogleAdsError(msg, 401, "REAUTH_REQUIRED");
        }
        throw e;
    }
}

/* ------------------------------------------------------------------ *
 *  REST client                                                        *
 * ------------------------------------------------------------------ */

function extractError(json: any, status: number): GoogleAdsError {
    const failure = json?.error?.details?.find((d: any) => Array.isArray(d?.errors));
    const first = failure?.errors?.[0];
    const code = first?.errorCode ? Object.values(first.errorCode)[0] as string : json?.error?.status;
    const message = first?.message || json?.error?.message || `Erro ${status} na API do Google Ads`;
    if (code === "DEVELOPER_TOKEN_NOT_APPROVED") {
        return new GoogleAdsError("O developer token ainda está em nível de teste e só acessa contas de teste. Solicite o acesso Básico no API Center.", status, code);
    }
    return new GoogleAdsError(message, status, code);
}

async function gadsFetch<T>(workspaceId: string, path: string, opts: { method?: string; body?: unknown; loginCustomerId?: string | null } = {}): Promise<T> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) throw new GoogleAdsError("GOOGLE_ADS_DEVELOPER_TOKEN não configurado no servidor.", 500, "NOT_CONFIGURED");

    const accessToken = await getGoogleAccessToken(workspaceId);
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
    };
    if (opts.loginCustomerId) headers["login-customer-id"] = normalizeCustomerId(opts.loginCustomerId);

    const res = await fetch(`${API_BASE}/${path}`, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw extractError(json, res.status);
    return json as T;
}

/** Runs a GAQL query and returns all rows (searchStream needs no pagination). */
export async function searchGaql<T = any>(workspaceId: string, customerId: string, query: string, loginCustomerId?: string | null): Promise<T[]> {
    const batches = await gadsFetch<{ results?: T[] }[]>(
        workspaceId,
        `customers/${normalizeCustomerId(customerId)}/googleAds:searchStream`,
        { method: "POST", body: { query }, loginCustomerId },
    );
    return (batches ?? []).flatMap(b => b.results ?? []);
}

/* ------------------------------------------------------------------ *
 *  Account discovery                                                  *
 * ------------------------------------------------------------------ */

export interface DiscoveredAccount {
    customer_id: string;
    descriptive_name: string;
    currency_code: string;
    time_zone: string | null;
    is_manager: boolean;
    login_customer_id: string | null;
    status: string;
}

/**
 * Lists every ad account the Google login can reach: accounts granted directly plus the
 * whole tree under any manager (MCC) account. Manager accounts themselves have no metrics,
 * so only leaf accounts are returned.
 */
export async function discoverGoogleAdsAccounts(workspaceId: string): Promise<DiscoveredAccount[]> {
    const { resourceNames = [] } = await gadsFetch<{ resourceNames?: string[] }>(workspaceId, "customers:listAccessibleCustomers");
    const rootIds = resourceNames.map(normalizeCustomerId);

    const found = new Map<string, DiscoveredAccount>();
    const errors: string[] = [];

    await Promise.all(rootIds.map(async rootId => {
        try {
            const rows = await searchGaql<any>(workspaceId, rootId, `
                SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code,
                       customer_client.time_zone, customer_client.manager, customer_client.status, customer_client.level
                FROM customer_client`, rootId);
            for (const r of rows) {
                const c = r.customerClient ?? {};
                const id = normalizeCustomerId(String(c.id ?? ""));
                if (!id || c.manager) continue;
                if (c.status && c.status !== "ENABLED") continue;
                const existing = found.get(id);
                // Prefer direct access (no manager hop) when the same account is reachable both ways
                const loginCustomerId = id === rootId ? null : rootId;
                if (existing && existing.login_customer_id === null) continue;
                found.set(id, {
                    customer_id: id,
                    descriptive_name: c.descriptiveName || `Conta ${formatCustomerId(id)}`,
                    currency_code: c.currencyCode || "BRL",
                    time_zone: c.timeZone ?? null,
                    is_manager: false,
                    login_customer_id: loginCustomerId,
                    status: c.status ?? "ENABLED",
                });
            }
        } catch (err: any) {
            // Cancelled/suspended accounts reject queries — skip them, keep the rest
            errors.push(`${formatCustomerId(rootId)}: ${err.message}`);
        }
    }));

    if (found.size === 0 && errors.length > 0) {
        throw new GoogleAdsError(`Nenhuma conta acessível. ${errors[0]}`);
    }
    return [...found.values()].sort((a, b) => a.descriptive_name.localeCompare(b.descriptive_name, "pt-BR"));
}

/** Refreshes the workspace's account list in the database and returns it. */
export async function syncGoogleAdsAccounts(workspaceId: string) {
    const discovered = await discoverGoogleAdsAccounts(workspaceId);
    const ids = discovered.map(a => a.customer_id);

    await prisma.$transaction([
        prisma.googleAdsAccount.deleteMany({ where: { workspace_id: workspaceId, customer_id: { notIn: ids } } }),
        ...discovered.map(a => prisma.googleAdsAccount.upsert({
            where: { workspace_id_customer_id: { workspace_id: workspaceId, customer_id: a.customer_id } },
            // is_hidden is a user choice — never overwrite it on sync
            update: {
                descriptive_name: a.descriptive_name,
                currency_code: a.currency_code,
                time_zone: a.time_zone,
                login_customer_id: a.login_customer_id,
                status: a.status,
            },
            create: { workspace_id: workspaceId, ...a },
        })),
        prisma.googleAdsConnection.update({
            where: { workspace_id: workspaceId },
            data: { last_synced_at: new Date(), last_error: null },
        }),
    ]);

    return prisma.googleAdsAccount.findMany({ where: { workspace_id: workspaceId }, orderBy: { descriptive_name: "asc" } });
}

/**
 * Loads an account only if it belongs to the workspace — every report/mutation goes through
 * this so a customer id from the client can never reach another workspace's account.
 */
export async function getWorkspaceGoogleAccount(workspaceId: string, customerId: string) {
    const account = await prisma.googleAdsAccount.findUnique({
        where: { workspace_id_customer_id: { workspace_id: workspaceId, customer_id: normalizeCustomerId(customerId) } },
    });
    if (!account) throw new GoogleAdsError("Conta Google Ads não encontrada neste workspace.", 404, "ACCOUNT_NOT_FOUND");
    return account;
}

/* ------------------------------------------------------------------ *
 *  Reporting                                                          *
 * ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateClause(startDate: string, endDate: string): string {
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
        throw new GoogleAdsError("Período inválido — use datas no formato AAAA-MM-DD.", 400, "INVALID_DATE");
    }
    return `segments.date BETWEEN '${startDate}' AND '${endDate}'`;
}

const micros = (v: unknown) => Number(v ?? 0) / 1_000_000;
const num = (v: unknown) => Number(v ?? 0);

export interface GoogleAdsMetrics {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversions_value: number;
    ctr: number;      // percent
    avg_cpc: number;
    cost_per_conversion: number;
    roas: number;
}

function deriveMetrics(m: { impressions: number; clicks: number; cost: number; conversions: number; conversions_value: number }): GoogleAdsMetrics {
    return {
        ...m,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
        avg_cpc: m.clicks > 0 ? m.cost / m.clicks : 0,
        cost_per_conversion: m.conversions > 0 ? m.cost / m.conversions : 0,
        roas: m.cost > 0 ? m.conversions_value / m.cost : 0,
    };
}

function readMetrics(row: any) {
    const m = row.metrics ?? {};
    return {
        impressions: num(m.impressions),
        clicks: num(m.clicks),
        cost: micros(m.costMicros),
        conversions: num(m.conversions),
        conversions_value: num(m.conversionsValue),
    };
}

export interface GoogleAdsCampaignRow extends GoogleAdsMetrics {
    id: string;
    name: string;
    status: string;
    channel: string;
    bidding_strategy: string | null;
    daily_budget: number | null;
}

export async function getGoogleAdsCampaigns(
    workspaceId: string, customerId: string, startDate: string, endDate: string, loginCustomerId?: string | null,
): Promise<GoogleAdsCampaignRow[]> {
    const rows = await searchGaql<any>(workspaceId, customerId, `
        SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
               campaign.bidding_strategy_type, campaign_budget.amount_micros,
               metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
        FROM campaign
        WHERE ${dateClause(startDate, endDate)} AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC`, loginCustomerId);

    return rows.map(r => ({
        id: String(r.campaign?.id ?? ""),
        name: r.campaign?.name ?? "Sem nome",
        status: r.campaign?.status ?? "UNKNOWN",
        channel: r.campaign?.advertisingChannelType ?? "UNKNOWN",
        bidding_strategy: r.campaign?.biddingStrategyType ?? null,
        daily_budget: r.campaignBudget?.amountMicros != null ? micros(r.campaignBudget.amountMicros) : null,
        ...deriveMetrics(readMetrics(r)),
    }));
}

export interface GoogleAdsDailyRow {
    date: string;
    cost: number;
    clicks: number;
    impressions: number;
    conversions: number;
    conversions_value: number;
}

export async function getGoogleAdsDaily(
    workspaceId: string, customerId: string, startDate: string, endDate: string, loginCustomerId?: string | null,
): Promise<GoogleAdsDailyRow[]> {
    const rows = await searchGaql<any>(workspaceId, customerId, `
        SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
        FROM customer
        WHERE ${dateClause(startDate, endDate)}
        ORDER BY segments.date`, loginCustomerId);

    return rows.map(r => ({ date: r.segments?.date ?? "", ...readMetrics(r) }));
}

export async function getGoogleAdsSummary(
    workspaceId: string, customerId: string, startDate: string, endDate: string, loginCustomerId?: string | null,
): Promise<GoogleAdsMetrics> {
    const rows = await searchGaql<any>(workspaceId, customerId, `
        SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
        FROM customer
        WHERE ${dateClause(startDate, endDate)}`, loginCustomerId);

    const total = rows.map(readMetrics).reduce(
        (acc, m) => ({
            impressions: acc.impressions + m.impressions,
            clicks: acc.clicks + m.clicks,
            cost: acc.cost + m.cost,
            conversions: acc.conversions + m.conversions,
            conversions_value: acc.conversions_value + m.conversions_value,
        }),
        { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversions_value: 0 },
    );
    return deriveMetrics(total);
}

export async function setGoogleAdsCampaignStatus(
    workspaceId: string, customerId: string, campaignId: string, status: "ENABLED" | "PAUSED", loginCustomerId?: string | null,
): Promise<void> {
    const cid = normalizeCustomerId(customerId);
    if (!/^\d+$/.test(campaignId)) throw new GoogleAdsError("ID de campanha inválido.", 400, "INVALID_ID");
    await gadsFetch(workspaceId, `customers/${cid}/campaigns:mutate`, {
        method: "POST",
        loginCustomerId,
        body: {
            operations: [{
                updateMask: "status",
                update: { resourceName: `customers/${cid}/campaigns/${campaignId}`, status },
            }],
        },
    });
}
