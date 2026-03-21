const { FacebookAdsApi, User, Page } = require('facebook-nodejs-business-sdk');
require('dotenv').config({ path: '.env' });

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error("Missing META_ACCESS_TOKEN in .env");
    process.exit(1);
}

const api = FacebookAdsApi.init(ACCESS_TOKEN);

async function testLeads() {
    console.log("🚀 Starting Leads Debug Script...");

    try {
        const user = new User('me');
        console.log("fetching user pages...");
        const pages = await user.getAccounts(['access_token', 'name', 'id']);
        console.log(`Found ${pages.length} pages.`);

        for (const pageData of pages) {
            console.log(`\n📄 Checking Page: ${pageData.name} (${pageData.id})`);
            try {
                // Check if we can access the page
                const page = new Page(pageData.id);
                const forms = await page.getLeadGenForms(['id', 'name', 'status'], { limit: 10 });
                console.log(`   Found ${forms.length} forms.`);

                for (const form of forms) {
                    console.log(`   📝 Form: ${form.name} (${form.id}) - ${form.status}`);
                    try {
                        const leads = await form.getLeads(['created_time', 'id'], { limit: 5 });
                        console.log(`      ✅ Leads found: ${leads.length}`);
                        if (leads.length > 0) {
                            console.log(`      Sample: ${JSON.stringify(leads[0])}`);
                        }
                    } catch (leadError) {
                        console.error(`      ❌ Error fetching leads for form ${form.id}:`, leadError.message || leadError);
                    }
                }
            } catch (pageError) {
                console.error(`   ❌ Error accessing page ${pageData.id}:`, pageError.message || pageError);
            }
        }

    } catch (error) {
        console.error("🔥 Fatal Error:", error);
    }
}

testLeads();
