import { getAdAccounts } from "../lib/meta-api";

async function debug() {
    console.log("Fetching all ad accounts...");
    const accounts = await getAdAccounts();
    console.log(JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name })), null, 2));
}

debug();
