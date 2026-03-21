const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    const currentHour = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).slice(0, 2);

    console.log(`Current Hour: ${currentHour}`);

    const gcAccounts = await prisma.account.findMany({
        where: {
            google_chat_enabled: true,
            google_chat_time: {
                startsWith: currentHour
            }
        }
    });

    console.log(`Matching accounts found: ${gcAccounts.length}`);
    gcAccounts.forEach(acc => {
        console.log(`- ${acc.account_name} (ID: ${acc.id}, Time: ${acc.google_chat_time}, Enabled: ${acc.google_chat_enabled})`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
