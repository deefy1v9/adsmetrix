const fs = require('fs');
async function main() {
    const accessToken = 'EAAM88WZCXsZAYBQjs3GQm1v8I7BS1LBJZBnQSOBcPxx3yia6AGYYN6u1xUqv36wBvWfKsxNDRKe2L9xXRqkFKtZAioqUNTcufoIRUhM5yaIIkZBEgu4fuyZB4piAj97E12ETMA2w8p9FixXtTZAv4grDGX3N7j6vvzeqE9D74LcbZA36uKQZBCY9QI2qVzK5dBUx69sdFtGSa';

    // 1. Fetch Ad Accounts
    const accountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&limit=100&access_token=${accessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();
    const criativoAccount = accountsData.data.find(a => a.name && a.name.toLowerCase().includes('criativo'));
    const accountId = criativoAccount.account_id;

    // 2. Fetch specific insights (conversions: actions, action_values)
    const insightsUrl = `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=campaign_name,adset_name,ad_name,actions,action_values,spend&level=ad&date_preset=maximum&access_token=${accessToken}`;
    const insightsRes = await fetch(insightsUrl);
    const insightsData = await insightsRes.json();

    let output = `=== Analysis for Account: ${criativoAccount.name} ===\n\n`;
    let totalCustomConversions = 0;
    const GTM_CUSTOM_TAGS = ['custom', 'offsite_conversion', 'lead', 'pixel'];

    insightsData.data.forEach(row => {
        const allActions = row.actions || [];
        if (allActions.length > 0) {
            output += `\nAd: ${row.ad_name} (${row.campaign_name})\n`;
            output += `Spend: R$ ${row.spend}\n`;
            output += '--- Configured Actions ---\n';

            allActions.forEach(a => {
                output += ` - ${a.action_type}: ${a.value}\n`;
                for (const tag of GTM_CUSTOM_TAGS) {
                    if (a.action_type.includes(tag)) {
                        totalCustomConversions++;
                        break;
                    }
                }
            });
        }
    });

    output += `\nTotal potential 'custom conversions' flags found: ${totalCustomConversions}\n`;
    fs.writeFileSync('scripts/conversions-output.utf8.txt', output, 'utf8');
}
main();
