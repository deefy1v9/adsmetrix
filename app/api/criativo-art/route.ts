import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const ATLAS_API_URL = "https://atlas.intelexia.com.br/functions/v1/generate-creative-api";

async function getApiKey(): Promise<string | null> {
    try {
        // Per-workspace key first
        const h = await headers();
        const workspaceId = h.get("x-workspace-id");
        if (workspaceId) {
            const setting = await (prisma.setting as any).findUnique({ where: { workspace_id: workspaceId } });
            if (setting?.criativo_art_api_key) return setting.criativo_art_api_key;
            return null; // workspace user has no key — don't leak global key
        }
        // Legacy admin (no workspace): global fallback
        const config = await prisma.globalConfig.findUnique({ where: { id: "singleton" } }) as any;
        if (config?.criativo_art_api_key) return config.criativo_art_api_key;
    } catch {}
    return process.env.CRIATIVO_ART_API_KEY || null;
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) {
            return NextResponse.json(
                { error: "Chave de API do Criativo.Art não configurada. Acesse Configurações para adicionar." },
                { status: 400 }
            );
        }

        const body = await req.json();

        const response = await fetch(ATLAS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || data.error || "Erro ao gerar criativo" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[CriativoArt] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
