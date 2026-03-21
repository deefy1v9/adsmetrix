import { NextResponse } from "next/server";
import { getAdAccounts } from "@/lib/meta-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
    console.log("[DebugAPI] Meta API check started...");

    const results: any = {
        timestamp: new Date().toISOString(),
        env_token_present: !!process.env.META_ACCESS_TOKEN,
        env_token_ends_with: process.env.META_ACCESS_TOKEN?.slice(-5),
        db_connection: "unknown",
        meta_api: {
            status: "unknown",
            count: 0,
            error: null
        }
    };

    // 1. Check DB
    try {
        const count = await prisma.account.count();
        results.db_connection = `OK (Accounts count: ${count})`;
    } catch (e: any) {
        results.db_connection = `FAILED: ${e.message}`;
    }

    // 2. Check Meta API
    try {
        const accounts = await getAdAccounts();
        results.meta_api.status = "SUCCESS";
        results.meta_api.count = accounts.length;
        if (accounts.length > 0) {
            results.meta_api.sample = {
                id: accounts[0].id,
                name: accounts[0].name
            };
        }
    } catch (e: any) {
        results.meta_api.status = "FAILED";
        results.meta_api.error = e.message;
    }

    return NextResponse.json(results);
}
