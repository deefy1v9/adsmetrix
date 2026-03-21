const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Search for Sanfi account in multiple ways
    const all = await prisma.account.findMany({
        select: {
            id: true,
            account_id: true,
            account_name: true,
            google_chat_webhook: true,
            google_chat_enabled: true,
        }
    });

    console.log('=== All accounts in DB ===');
    all.forEach(a => {
        console.log(`Name: ${a.account_name} | DB id: ${a.id} | account_id: ${a.account_id} | webhook: ${a.google_chat_webhook ? 'SET' : 'NULL'}`);
    });

    // Simulate the fixed save logic for Sanfi
    console.log('\n=== Simulating save for each enabled GChat account ===');
    for (const acc of all) {
        const accountId = acc.account_id; // This is what comes from Meta API
        const numericId = accountId.replace('act_', '');
        const prefixedId = `act_${numericId}`;

        const found = await prisma.account.findFirst({
            where: {
                OR: [
                    { account_id: prefixedId },
                    { account_id: numericId },
                ]
            }
        });
        console.log(`${acc.account_name}: searching with prefixed=${prefixedId}, numeric=${numericId} => found=${found ? found.account_name : 'NOT FOUND'}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
