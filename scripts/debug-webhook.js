// A raw dump of a webhook payload that Elementor sends
const rawBody = {
    "form": {
        "id": 1,
        "name": "Form Abertura"
    },
    "fields": {
        "name": {
            "value": "davi teste"
        },
        "email": {
            "value": "davi@teste.com"
        }
    },
    "meta": {
        "page_url": "https://bilula.com.br/lp-abertura"
    }
}

// How our code currently reads it
const originUrl1 = String(
    rawBody?.['meta[page_url]'] ||
    rawBody?.page_url ||
    rawBody?.source_url ||
    rawBody?.url ||
    'Webhook Direto'
);
console.log("Reading flat keys:", originUrl1);

// How I should read it if it's sent as an object
const originUrl2 = String(
    rawBody?.meta?.page_url ||
    rawBody?.['meta[page_url]'] ||
    rawBody?.page_url ||
    rawBody?.source_url ||
    rawBody?.url ||
    'Webhook Direto'
);
console.log("Reading nested keys:", originUrl2);
