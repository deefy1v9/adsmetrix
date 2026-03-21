const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate the fixed saveGoogleChatSettingsAction logic
async function testSave(accountId, accountName) {
    try {
        const numericId = accountId.replace('act_', '');
        const prefixedId = `act_${numericId}`;

        const existing = await prisma.account.findFirst({
            where: {
                OR: [
                    { account_id: prefixedId },
                    { account_id: numericId },
                ]
            }
        });

        const updateData = {
            google_chat_webhook: 'https://test-webhook.example.com',
            google_chat_enabled: true,
            google_chat_time: '09:48',
            google_chat_range: 'today',
            google_chat_type: 'text',
        };

        if (existing) {
            console.log(`Found existing account: ${existing.account_name} (id: ${existing.id})`);
            await prisma.account.update({
                where: { id: existing.id },
                data: updateData,
            });
            console.log('Updated successfully');
        } else {
            console.log('No existing account found, would create new one');
        }

        return { success: true };
    } catch (error) {
        console.error('Error in testSave:', error);
        return { success: false, error: error.message };
    }
}

async function main() {
    // Simulate the call from the UI page — account.id from Meta API is in act_ format
    const account = await prisma.account.findFirst({
        where: { google_chat_enabled: true }
    });

    if (!account) {
        console.log('No GChat account found');
        return;
    }

    // Simulate the act_ format that comes from the UI 
    const metaId = `act_${account.account_id.replace('act_', '')}`;
    console.log(`Testing with metaId: ${metaId}`);

    const result = await testSave(metaId, account.account_name);
    console.log('Result:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
