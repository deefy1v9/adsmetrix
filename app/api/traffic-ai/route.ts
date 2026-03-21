import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";


const CHAT_SYSTEM_PROMPT = `Você é um gestor de tráfego profissional focado em Meta Ads de alto nível.
Sua linguagem é direta e focada em resultados (ROAS, CPA, CPL).
Ao receber uma ideia de campanha, divida sua resposta na seguinte estrutura bem formatada:
**1. Objetivo da Campanha** (Qual objetivo usar no Meta Ads)
**2. Público-Alvo** (Interesses reais, Lookalike sugerido ou remarketing)
**3. Ângulos de Criativo** (Ideias viáveis de imagem/vídeo para teste A/B)
**4. Copy (Textos)** (Sugestão de texto com gatilhos mentais diretos)
**5. Orçamento e Estrutura** (Como distribuir o budget inicial e ABO vs CBO)

Por favor, seja pragmático. Não faça introduções muito longas.`;

const CREATE_CAMPAIGN_SYSTEM_PROMPT = `Você é um especialista em Meta Ads e copywriting de performance. A partir da descrição do usuário, retorne APENAS um único objeto JSON válido, sem nenhum texto adicional, com a seguinte estrutura:
{
  "name": "Nome descritivo da campanha (máx 50 caracteres)",
  "objective": "um dos valores: OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_SALES, OUTCOME_ENGAGEMENT",
  "daily_budget": 30,
  "special_ad_categories": [],
  "ad_sets": [
    {
      "name": "Nome do conjunto (máx 50 caracteres)",
      "interests": ["interesse1", "interesse2"],
      "age_min": 18,
      "age_max": 65,
      "countries": ["BR"],
      "excluded_regions": [],
      "ad_headline": "Título do link — chamativo e direto (máx 40 caracteres)",
      "ad_body": "Texto principal do anúncio com gatilhos mentais. Use 2-4 parágrafos curtos. Inclua prova social, urgência ou dor do público. Termine com uma CTA clara. Pode incluir emojis e hashtags relevantes.",
      "ad_destination_url": "",
      "ad_cta_type": "LEARN_MORE"
    }
  ]
}

IMPORTANTE:
- Retorne SEMPRE um único objeto JSON (não um array, não um objeto com chave "campaigns")
- O campo "daily_budget" deve ser um número (ex: 40), nunca uma string
- Se o usuário pedir múltiplas campanhas, retorne apenas os parâmetros da primeira campanha
- Se o usuário pedir múltiplos conjuntos de anúncios, inclua todos no array "ad_sets"
- Os interesses em "interests" devem ser em inglês (ex: "Dentistry", "Law", "Health")
- Em "excluded_regions" coloque os nomes das regiões/estados a excluir em português (ex: "Bahia", "Nordeste")
- Se o usuário mencionar "nordeste", liste os 9 estados: "Maranhão", "Piauí", "Ceará", "Rio Grande do Norte", "Paraíba", "Pernambuco", "Alagoas", "Sergipe", "Bahia"
- Se não mencionar conjuntos, crie 1 conjunto padrão com os dados disponíveis

Regras para objective:
- Se falar em leads, formulários, captação → OUTCOME_LEADS
- Se falar em visitas, tráfego, cliques → OUTCOME_TRAFFIC
- Se falar em vendas, compras, e-commerce → OUTCOME_SALES
- Se falar em seguidores, engajamento, curtidas → OUTCOME_ENGAGEMENT
- Se falar em marca, alcance, reconhecimento → OUTCOME_AWARENESS

Regras para ad_cta_type (escolha o mais adequado ao objetivo e nicho):
- OUTCOME_LEADS → "SIGN_UP" ou "CONTACT_US" ou "GET_QUOTE"
- OUTCOME_TRAFFIC → "LEARN_MORE"
- OUTCOME_SALES → "SHOP_NOW" ou "GET_QUOTE"
- OUTCOME_ENGAGEMENT → "LEARN_MORE"
- OUTCOME_AWARENESS → "LEARN_MORE"

Regras para ad_headline e ad_body:
- ad_headline: título conciso, direto, que gera curiosidade ou urgência. Ex: "Proteja seu CPF agora", "50% OFF só hoje", "Pare de perder dinheiro"
- ad_body: copy persuasivo baseado no nicho do usuário. Mencione a dor principal, a solução e os benefícios. Use emojis com moderação. Termine com instrução de ação (ex: "👉 Clique em Entrar em Contato")
- ad_destination_url: deixe sempre como string vazia "" (o usuário preencherá)

Se o orçamento não for mencionado, use 30 (R$30/dia) como padrão.
Retorne SOMENTE o JSON, sem markdown, sem explicações.`;

export async function POST(req: Request) {
    try {
        const { prompt, mode = "chat", messages = [] } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "O prompt é obrigatório." }, { status: 400 });
        }

        const apiKey = process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "CLAUDE_API_KEY não configurada no .env. Reinicie o servidor após configurar." }, { status: 500 });
        }

        const anthropic = new Anthropic({ apiKey });

        if (mode === "create_campaign") {
            // Structured JSON extraction mode
            const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1500,
                temperature: 0.2,
                system: CREATE_CAMPAIGN_SYSTEM_PROMPT,
                messages: [{ role: "user", content: prompt }]
            });

            const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

            try {
                // Strip potential markdown code blocks
                const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                let parsed = JSON.parse(jsonStr);

                // Normalize: if Claude returned an array or a wrapper object
                if (Array.isArray(parsed)) {
                    parsed = parsed[0];
                } else if (parsed.campaigns && Array.isArray(parsed.campaigns)) {
                    parsed = parsed.campaigns[0];
                }

                // Coerce daily_budget to number
                parsed.daily_budget = Number(parsed.daily_budget);

                // Validate required fields
                if (!parsed.name || !parsed.objective || isNaN(parsed.daily_budget)) {
                    return NextResponse.json({ error: "Não consegui extrair os parâmetros. Tente descrever melhor a campanha." }, { status: 422 });
                }

                return NextResponse.json({ campaignParams: parsed });
            } catch {
                return NextResponse.json({ error: "Não consegui extrair os parâmetros. Tente descrever melhor a campanha." }, { status: 422 });
            }
        }

        // Default: chat mode with conversation history
        const conversationMessages = [
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role === "ai" ? "assistant" : "user" as "user" | "assistant",
                content: m.content
            })),
            { role: "user" as const, content: prompt }
        ];

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
            temperature: 0.7,
            system: CHAT_SYSTEM_PROMPT,
            messages: conversationMessages
        });

        const reply = response.content[0].type === "text" ? response.content[0].text : "Desculpe, não consegui completar a estratégia.";

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error("Erro na integração com o Claude:", error);
        const msg = error?.status === 401 || error?.status === 403
            ? "API Key do Claude inválida ou expirada. Atualize CLAUDE_API_KEY no .env"
            : error?.message || "Erro desconhecido ao chamar a API do Claude";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
