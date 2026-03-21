// Script to fetch Criativo Art ad account ID and check current conversions

async function main() {
    const accessToken = 'EAAM88WZCXsZAYBQjs3GQm1v8I7BS1LBJZBnQSOBcPxx3yia6AGYYN6u1xUqv36wBvWfKsxNDRKe2L9xXRqkFKtZAioqUNTcufoIRUhM5yaIIkZBEgu4fuyZB4piAj97E12ETMA2w8p9FixXtTZAv4grDGX3N7j6vvzeqE9D74LcbZA36uKQZBCY9QI2qVzK5dBUx69sdFtGSa';

    // 1. Fetch Ad Accounts
    console.log("Fetching Ad Accounts...");
    const accountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&limit=100&access_token=${accessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
        console.error("Error fetching accounts:", accountsData.error);
        return;
    }

    const criativoAccount = accountsData.data.find(a => a.name && a.name.toLowerCase().includes('criativo'));

    if (!criativoAccount) {
        console.log("Could not find 'Criativo Art' in the ad accounts list.");
        return;
    }

    const accountId = criativoAccount.account_id;
    console.log(`Found Account: ${criativoAccount.name} (ID: ${accountId})`);

    // 2. Fetch specific insights (conversions: actions, action_values)
    // Date preset: maximum, or last_30d
    const insightsUrl = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=campaign_name,adset_name,ad_name,actions,action_values,spend&level=ad&date_preset=maximum&access_token=${accessToken}`;

    console.log("Fetching Insights for custom conversions...");
    const insightsRes = await fetch(insightsUrl);
    const insightsData = await insightsRes.json();

    if (insightsData.error) {
        console.error("Error fetching insights:", insightsData.error);
        return;
    }

    if (!insightsData.data || insightsData.data.length === 0) {
        console.log("No insights data returned (0 spend/impressions or no active ads).");
        return;
    }

    console.log(`\n\n=== Analysis for Account: ${criativoAccount.name} ===\n`);

    let totalCustomConversions = 0;
    const GTM_CUSTOM_TAGS = ['custom', 'offsite_conversion', 'lead', 'pixel'];

    insightsData.data.forEach(row => {
        const allActions = row.actions || [];

        // Let's print out the actions if there are any
        if (allActions.length > 0) {
            console.log(`\nAd: ${row.ad_name} (${row.campaign_name})`);
            console.log(`Spend: R$ ${row.spend}`);
            console.log('--- Configured Actions ---');

            allActions.forEach(a => {
                console.log(` - ${a.action_type}: ${a.value}`);
                // Check if it looks like a GTM custom conversion
                for (const tag of GTM_CUSTOM_TAGS) {
                    if (a.action_type.includes(tag)) {
                        totalCustomConversions++;
                        break;
                    }
                }
            });
        }
    });

    console.log(`\nTotal potential 'custom conversions' flags found: ${totalCustomConversions}`);
}

main();
