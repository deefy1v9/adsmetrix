const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Using native fetch in Node 18+

// Simplified but realistic mock of the updated sendGoogleChatReportAction
async function verifyGoogleChatReport(accountId) {
    try {
        const account = await prisma.account.findFirst({
            where: { id: accountId }
        });

        if (!account || !account.google_chat_webhook) {
            return { success: false, error: 'Account or webhook not found' };
        }

        console.log(`Verifying for account: ${account.account_name}`);

        // Simulating the actual send logic
        const message = "✅ Verificação de Correção de Relatório Automático (Deepmind Test)";
        console.log('Sending message to Google Chat...');

        const response = await fetch(account.google_chat_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Google Chat API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        console.log('Update successful, now updating last_report_sent_at...');
        await prisma.account.update({
            where: { id: accountId },
            data: { last_gc_report_sent_at: new Date() }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    const account = await prisma.account.findFirst({
        where: { google_chat_enabled: true }
    });

    if (!account) {
        console.log('No account found with Google Chat enabled');
        return;
    }

    const result = await verifyGoogleChatReport(account.id);
    console.log('Result:', result);

    if (result.success) {
        const updatedAccount = await prisma.account.findUnique({
            where: { id: account.id },
            select: { last_gc_report_sent_at: true }
        });
        console.log('Updated last_gc_report_sent_at:', updatedAccount.last_gc_report_sent_at);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
