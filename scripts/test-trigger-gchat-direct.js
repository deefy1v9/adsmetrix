const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Mocking the behavior of sendGoogleChatReportAction without Next.js aliases
async function testGoogleChat(accountId) {
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

        if (!account || !account.google_chat_webhook) {
            return { success: false, error: 'Google Chat webhook not configured' };
        }

        console.log(`Testing account: ${account.account_name}`);
        console.log(`Webhook: ${account.google_chat_webhook}`);

        const message = "🚀 Teste de Relatório Automático (Manual Trigger)";

        console.log('Sending message to Google Chat...');
        const response = await fetch(account.google_chat_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Google Chat API error: ${response.status} ${text}`);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    const account = await prisma.account.findFirst({
        where: {
            google_chat_enabled: true,
        }
    });

    if (!account) {
        console.log('No account found with Google Chat enabled');
        return;
    }

    const result = await testGoogleChat(account.id);
    console.log('Result:', result);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
