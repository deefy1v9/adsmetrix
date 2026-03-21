async function fetchWebhooks() {
    try {
        const response = await fetch('https://ads.metrixbr.com/api/debug/webhooks/recent', {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            console.log(JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('Response was not JSON:', text.substring(0, 500));
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
fetchWebhooks();
