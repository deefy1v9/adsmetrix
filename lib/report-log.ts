import { prisma } from "@/lib/prisma";

interface ReportLogData {
    account_id: string;
    account_name: string;
    channel: "whatsapp";
    status: "success" | "error";
    error_msg?: string;
    range?: string;
    workspace_id?: string;
}

export async function createReportLog(data: ReportLogData): Promise<void> {
    try {
        await (prisma as any).reportLog.create({ data });
    } catch {
        // Silently ignore — log failure must never break the report dispatch
    }
}
