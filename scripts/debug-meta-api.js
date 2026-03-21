const { getAdAccounts } = require('../lib/meta-api');
const { prisma } = require('../lib/prisma');

async function debug() {
    console.log("=== Debugging Meta API Account Fetch ===");

    // 1. Check ENV token
    console.log("META_ACCESS_TOKEN in env:", process.env.META_ACCESS_TOKEN ? "Present (ends with " + process.env.META_ACCESS_TOKEN.slice(-5) + ")" : "MISSING");

    // 2. Check Global Config in DB
    try {
        const globalConfig = await prisma.globalConfig.findUnique({
            where: { id: 'singleton' },
            select: { meta_access_token: true }
        });
        console.log("Global token in DB:", globalConfig?.meta_access_token ? "Present" : "MISSING");
    } catch (e) {
        console.error("Error fetching global config:", e.message);
    }

    // 3. Try to fetch accounts
    console.log("\nAttempting to call getAdAccounts()...");
    try {
        const accounts = await getAdAccounts();
        console.log("Result count:", accounts.length);
        if (accounts.length > 0) {
            console.log("First account found:", accounts[0].name, "(ID: " + accounts[0].id + ")");
        } else {
            console.warn("NO ACCOUNTS RETURNED. Check Meta API permissions or token validity.");
        }
    } catch (err) {
        console.error("FATAL ERROR in getAdAccounts:", err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
