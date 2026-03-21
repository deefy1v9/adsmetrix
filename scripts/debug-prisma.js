const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing Prisma connection...');
        const count = await prisma.account.count();
        console.log('Total accounts in DB:', count);

        const account = await prisma.account.findFirst();
        if (account) {
            console.log('Successfully fetched first account.');
            console.log('Account fields:', Object.keys(account));
            console.log('Innovtalk Key:', account.innovtalk_api_key);
            console.log('Innovtalk Enabled:', account.innovtalk_enabled);
        } else {
            console.log('No accounts found in database.');
        }
    } catch (err) {
        console.error('PRISMA RUNTIME ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
