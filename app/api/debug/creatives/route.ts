import { NextResponse } from "next/server";
import { getTopCreatives } from "@/lib/meta-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
        // Try to get first account from DB
        const account = await prisma.account.findFirst();
        if (!account) return NextResponse.json({ error: "Nenhuma conta encontrada. Passe ?accountId=act_XXX" });

        const creatives = await getTopCreatives(account.account_id, 'last_30d');
        return NextResponse.json({ accountId: account.account_id, count: creatives.length, creatives });
    }

    const creatives = await getTopCreatives(accountId, 'last_30d');
    return NextResponse.json({ accountId, count: creatives.length, creatives });
}
