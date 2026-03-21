import { NextResponse } from "next/server";

export async function GET() {
    // Mock response - in production this would query Prisma
    return NextResponse.json({
        data: [
            { id: "1", name: "Lead Mock 1", status: "novo" },
            { id: "2", name: "Lead Mock 2", status: "contatado" },
        ],
    });
}

export async function POST(request: Request) {
    const data = await request.json();
    // Mock creation
    return NextResponse.json({ success: true, id: "new_id", ...data });
}
