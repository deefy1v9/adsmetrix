const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Find the Criativo Art account
        const accounts = await prisma.account.findMany({
            where: {
                account_name: {
                    contains: 'criativo',
                    mode: 'insensitive'
                }
            }
        });

        if (accounts.length === 0) {
            console.log("Account containing 'criativo' not found in db.");
            return;
        }

        const account = accounts[0];
        console.log(`Found Account: ${account.account_name} (ID: ${account.account_id})`);

        // Get the access token from the global settings
        const settings = await prisma.setting.findFirst();
        const accessToken = settings?.meta_access_token;

        if (!accessToken) {
            console.log("Meta access token not found in settings.");
            return;
        }

        // Fetch campaigns to get insights with 'actions' to see custom conversions
        const url = `https://graph.facebook.com/v19.0/act_${account.account_id}/insights?fields=campaign_name,adset_name,ad_name,actions,action_values,spend&level=ad&date_preset=maximum&access_token=${accessToken}`;

        console.log("Fetching insights from Meta API...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Meta API Error:", data.error.message);
            return;
        }

        console.log(`\n\n=== Analysis for Account: ${account.account_name} ===\n`);

        let foundConversions = 0;
        data.data?.forEach(row => {
            // Find any actions that might represent conversions
            // Commonly 'offsite_conversion', 'lead', or something starting with 'custom'
            const allActions = row.actions || [];

            if (allActions.length > 0) {
                console.log(`\nAd: ${row.ad_name}`);
                console.log(`Spend: ${row.spend}`);
                console.log('--- ALL Actions ---');
                allActions.forEach(a => {
                    console.log(` - ${a.action_type}: ${a.value}`);
                    if (a.action_type.includes('offsite_conversion') || a.action_type.includes('custom') || a.action_type.includes('lead')) {
                        foundConversions++;
                    }
                });
            }
        });

        console.log(`\nTotal potential conversions/custom actions found: ${foundConversions}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
