require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanup() {
    const accs = await p.account.findMany();
    let deleted = 0;
    for (const a of accs) {
        if (a.account_id.includes('-')) {
            console.log(`Deleting dummy account: ${a.account_name} (${a.account_id})`);
            await p.account.delete({ where: { id: a.id } });
            deleted++;
        }
    }
    console.log(`Deleted ${deleted} dummy accounts.`);
}

cleanup().catch(console.error).finally(() => p.$disconnect());
