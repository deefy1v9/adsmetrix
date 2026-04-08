import { NextResponse } from "next/server";
import { sendScheduledWaBlastsAction } from "@/actions/wa-blast-actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get("token");

    const rawSecret = process.env.CRON_SECRET || "";
    const cronSecret = rawSecret.trim().replace(/^["']|["']$/g, "");

    const isAuthenticated =
        (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
        (cronSecret && queryToken === cronSecret);

    if (cronSecret && !isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Current time in BRT (UTC-3)
    const now = new Date();
    const brt = new Date(now.getTime() + (-3 * 60 - now.getTimezoneOffset()) * 60000);
    const todayDay = brt.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    const currentTime = `${brt.getHours().toString().padStart(2, "0")}:${brt.getMinutes().toString().padStart(2, "0")}`;

    try {
        const result = await sendScheduledWaBlastsAction(todayDay, currentTime);
        return NextResponse.json({ timestamp: now.toISOString(), ...result });
    } catch (error) {
        console.error("Error in wa-blast cron:", error);
        return NextResponse.json(
            { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
