const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.account.findMany({
        where: {
            google_chat_enabled: true,
        },
        select: {
            account_name: true,
            google_chat_webhook: true,
            google_chat_time: true,
            google_chat_enabled: true,
            last_report_sent_at: true,
        }
    });

    console.log(JSON.stringify(accounts, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
