const { sendGoogleChatReportAction } = require('../actions/report-actions');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    console.log(`Triggering report for account: ${account.account_name} (${account.id})`);
    const result = await sendGoogleChatReportAction(account.id);
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
