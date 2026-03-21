const { sendGoogleChatTestReportAction } = require('../actions/google-chat-actions');
// Note: This won't work directly because of Next.js @ aliases and 'use server'
// I'll create a script that simulates the logic exactly.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAction(accountId, range = 'today') {
    console.log(`Debugging for accountId: ${accountId}, range: ${range}`);
    try {
        const account = await prisma.account.findFirst({
            where: {
                OR: [
                    { id: accountId },
                    { account_id: accountId },
                    { account_id: accountId.replace('act_', '') }
                ]
            },
        });

        if (!account) {
            console.log("Account not found");
            return;
        }

        console.log("Account found:", account.account_name);
        console.log("Webhook:", account.google_chat_webhook);

        // Simulate fetchAggregatedMetricsAction logic if we can't call it
        // For now, let's just see if we can find the account and if fields exist.

        if (!account.google_chat_webhook) {
            console.log("No webhook configured");
            return;
        }

        // The issue might be in how fetch works in this environment.
        console.log("Success find account, proceeding to potential crash points...");

    } catch (error) {
        console.error("CAUGHT ERROR:", error);
    }
}

async function main() {
    // Try to find an account that likely matches the one in screenshot
    const accounts = await prisma.account.findMany();
    console.log(`Found ${accounts.length} accounts in total.`);

    for (const acc of accounts) {
        if (acc.account_name.includes("Sanfi") || acc.google_chat_enabled) {
            await debugAction(acc.id);
        }
    }
}

main().finally(() => prisma.$disconnect());
