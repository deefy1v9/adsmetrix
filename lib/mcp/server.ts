import { APP_NAME } from "@/lib/brand";
import { GoogleAdsError } from "@/lib/google-ads";
import type { McpAuthContext } from "./oauth";
import { ToolInputError, toolsForScopes, TOOLS } from "./tools";

/**
 * Minimal stateless MCP server (Streamable HTTP transport, JSON responses, no sessions).
 * Implements lifecycle (initialize/ping) and tools; everything else answers "method not found".
 * Spec: https://modelcontextprotocol.io/specification/2025-11-25
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_VERSION = "1.0.0";

const INSTRUCTIONS = `Servidor do ${APP_NAME}: dados de Meta Ads, Google Ads e leads do workspace do usuário.
- Comece com list_ad_accounts para obter os ids (Meta: act_123...; Google: 123-456-7890).
- Valores monetários estão na moeda da conta (normalmente BRL). Datas no fuso de Brasília; last_7d/last_30d excluem o dia de hoje.
- get_cross_platform_summary compara canais; get_meta_ads_performance e get_google_ads_performance detalham uma conta.
- update_campaign_status altera veiculação real: só use após confirmação explícita do usuário.`;

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: JsonRpcId;
    method?: string;
    params?: any;
}

export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: JsonRpcId;
    result?: unknown;
    error?: { code: number; message: string; data?: unknown };
}

const rpcError = (id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse =>
    ({ jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } });

const rpcResult = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

function toolResult(value: unknown) {
    const structured = value && typeof value === "object" && !Array.isArray(value) ? value : { result: value };
    return {
        content: [{ type: "text", text: JSON.stringify(value) }],
        structuredContent: structured,
        isError: false,
    };
}

function toolError(message: string) {
    return { content: [{ type: "text", text: message }], isError: true };
}

async function callTool(params: any, ctx: McpAuthContext) {
    const name = params?.name;
    const tool = TOOLS.find(t => t.name === name);
    if (!tool) return { error: { code: -32602, message: `Ferramenta desconhecida: ${name}` } };
    if (!ctx.scopes.includes(tool.scope)) {
        return {
            result: toolError(
                `Esta conexão não tem a permissão "${tool.scope}". Peça ao usuário para reconectar o ${APP_NAME} no Claude e marcar essa permissão na tela de autorização.`,
            ),
        };
    }

    const args = params?.arguments && typeof params.arguments === "object" ? params.arguments : {};
    try {
        return { result: toolResult(await tool.handler(args, ctx)) };
    } catch (err: any) {
        // Expected problems (bad input, platform errors) go back to the model as tool errors so it can recover
        if (err instanceof ToolInputError || err instanceof GoogleAdsError) return { result: toolError(err.message) };
        console.error(`[MCP] tool ${name} failed:`, err);
        return { result: toolError(`Erro ao executar ${name}: ${err?.message ?? "erro desconhecido"}`) };
    }
}

/** Handles one JSON-RPC message. Returns null for notifications and client responses (no reply). */
export async function handleMessage(message: unknown, ctx: McpAuthContext): Promise<JsonRpcResponse | null> {
    if (!message || typeof message !== "object" || (message as any).jsonrpc !== "2.0") {
        return rpcError(null, -32600, "Invalid Request");
    }
    const msg = message as JsonRpcRequest;

    // Notifications (no id) and responses to server requests need no answer
    if (msg.id === undefined || msg.id === null) return null;
    if (typeof msg.method !== "string") return null;

    const id = msg.id;
    switch (msg.method) {
        case "initialize": {
            const requested = msg.params?.protocolVersion;
            const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
            return rpcResult(id, {
                protocolVersion,
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: "metrix-ads", title: APP_NAME, version: SERVER_VERSION },
                instructions: INSTRUCTIONS,
            });
        }
        case "ping":
            return rpcResult(id, {});
        case "tools/list":
            return rpcResult(id, {
                tools: toolsForScopes(ctx.scopes).map(t => ({
                    name: t.name,
                    title: t.title,
                    description: t.description,
                    inputSchema: t.inputSchema,
                    annotations: { title: t.title, ...t.annotations },
                })),
            });
        case "tools/call": {
            const { result, error } = await callTool(msg.params, ctx);
            return error ? rpcError(id, error.code, error.message) : rpcResult(id, result);
        }
        // Not offered, but answering empty keeps clients that probe them happy
        case "resources/list":
            return rpcResult(id, { resources: [] });
        case "resources/templates/list":
            return rpcResult(id, { resourceTemplates: [] });
        case "prompts/list":
            return rpcResult(id, { prompts: [] });
        default:
            return rpcError(id, -32601, `Method not found: ${msg.method}`);
    }
}
