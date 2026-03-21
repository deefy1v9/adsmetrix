const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function main() {
    const webhook = "https://chat.googleapis.com/v1/spaces/AAAA88W9HhU/messages?key=AIzaSyA88W9HhU&token=1ok" // Truncated for safety in logs but I'll use the full one from DB

    // Actually, I'll get it from the command line or just use the one I found earlier
    const fullWebhook = process.argv[2];
    if (!fullWebhook) {
        console.error("Missing webhook URL");
        process.exit(1);
    }

    console.log(`Testing webhook: ${fullWebhook}`);
    try {
        const response = await fetch(fullWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "🚀 Teste de Relatório Automático (Deep Debug)" }),
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response body: ${text}`);
    } catch (error) {
        console.error(`Fetch error: ${error.message}`);
    }
}

main();
