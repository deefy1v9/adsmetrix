/** OAuth scopes for MCP connections. Client-safe (used by the consent screen). */
export const MCP_SCOPES: Record<string, { label: string; description: string }> = {
    "ads:read": {
        label: "Ler contas e métricas de anúncios",
        description: "Contas Meta Ads e Google Ads, campanhas, investimento, conversões e criativos.",
    },
    "leads:read": {
        label: "Ler leads",
        description: "Nome, e-mail, telefone e origem dos leads capturados pelas campanhas.",
    },
    "ads:write": {
        label: "Pausar e ativar campanhas",
        description: "Permite que o Claude altere o status de campanhas no Meta Ads e no Google Ads.",
    },
};
export const SUPPORTED_SCOPES = Object.keys(MCP_SCOPES);
export const DEFAULT_SCOPES = ["ads:read", "leads:read"];
