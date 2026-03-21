const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.account.findMany();
    for (const acc of accounts) {
        console.log(`--- Account: ${acc.account_name} ---`);
        console.log(`id: ${acc.id}`);
        console.log(`account_id: ${acc.account_id}`);
        console.log(`google_chat_webhook: ${acc.google_chat_webhook}`);
        console.log(`google_chat_enabled: ${acc.google_chat_enabled}`);
        console.log(`google_chat_time: ${acc.google_chat_time}`);
        console.log(`google_chat_range: ${acc.google_chat_range}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
