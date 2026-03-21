export async function syncAccounts() {
    console.log("Starting account sync...");
    // Simulate API calls delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Accounts synced successfully.");
    return { success: true, accounts_updated: 3 };
}

export async function syncLeads() {
    console.log("Starting leads sync...");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Leads synced successfully.");
    return { success: true, leads_new: 5 };
}
