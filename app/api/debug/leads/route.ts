import { debugLeadsFetch } from "@/lib/meta-api";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const logs = await debugLeadsFetch();
        return NextResponse.json({ logs });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
