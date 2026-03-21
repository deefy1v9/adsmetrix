const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const account = await prisma.account.findFirst({
        where: {
            account_name: {
                contains: 'Sanfi'
            }
        }
    });

    console.log(JSON.stringify(account, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
