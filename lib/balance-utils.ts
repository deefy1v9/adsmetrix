export interface MetaAdSet {
    id: string;
    name: string;
    status: string;
    campaign_id: string;
    insights?: {
        impressions: string;
        clicks: string;
        spend: string;
        cpc: string;
        ctr: string;
        leads: string;
        conversations?: string;
        reach?: string;
        page_likes?: string;
    };
}

export interface MetaCampaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    end_time?: string;   // ISO date string — campaign scheduled end date (stop_time from Meta API)
    insights?: {
        impressions: string;
        clicks: string;
        spend: string;
        cpc: string;
        ctr: string;
        reach?: string;
        cpm?: string;
        leads: string;
        leads_form?: string;
        leads_gtm?: string;
        sales?: string;
        purchase_value?: string;
        roas?: string;
        conversations?: string;
        page_likes?: string;
        instagram_profile_visits?: string;
        post_engagements?: string;
        comments?: string;
        video_views?: string;
        // Pixel events
        initiate_checkout?: string;
        add_to_cart?: string;
        view_content?: string;
        complete_registration?: string;
        add_payment_info?: string;
    };
}

export interface MetaLead {
    id: string;
    created_time: string;
    field_data: Array<{ name: string; values: string[] }>;
    form_id: string;
    form_name?: string;
    ad_name?: string;
    platform?: string;
}

export interface MetaCreative {
    id: string;
    name: string;
    campaign_name?: string;
    status: string;
    effective_status?: string;
    thumbnail_url?: string;
    preview_url?: string;
    video_id?: string;
    insights?: {
        impressions: string;
        clicks: string;
        spend: string;
        ctr: string;
        leads: string;
        leads_form?: string;
        leads_gtm?: string;
        sales?: string;
        conversations?: string;
    };
}

export interface MetaAdAccount {
    id: string;
    name: string;
    account_id: string;
    currency: string;
    account_status: number;
    balance?: number;
    amount_spent?: number;
    spend_cap?: number;
    is_prepay_account?: boolean;
    funding_source_details?: {
        display_string: string;
        type: string;
        amount?: string;
        currency?: string;
    };
    daily_report_enabled?: boolean;
    daily_report_time?: string;
    daily_report_range?: string;
    report_metrics_config?: Record<string, boolean> | null;
    report_custom_message?: string | null;
    max_cpr?: number | null;
}

export function calculateAvailableBalance(account: Partial<MetaAdAccount>): number {
    let displayBalance = 0;
    const isPrepay = account.is_prepay_account;
    const fundingSourceDetails = account.funding_source_details;
    const spendCap = account.spend_cap;
    const accountBalance = account.balance;
    const amountSpent = account.amount_spent;

    if (isPrepay) {
        // First priority: Try to parse the human-readable string from Meta
        if (fundingSourceDetails?.display_string) {
            const match = fundingSourceDetails.display_string.match(/R\$\s?([\d.,]+)/) ||
                fundingSourceDetails.display_string.match(/([\d.,]+)/);
            if (match) {
                const rawValue = match[1].replace(/\./g, '').replace(',', '.');
                displayBalance = parseFloat(rawValue);
            }
        }

        // Second priority/fallback: If regex failed or string missing, try the calculation
        // NOTE: We only use balance/100 as fallback. We do NOT add spend_cap anymore.
        if (displayBalance === 0) {
            displayBalance = Math.abs(accountBalance || 0) / 100;
        }
    } else {
        // Para contas de cartão (post-pay), o saldo não existe no mesmo sentido.
        displayBalance = 0;
    }

    return displayBalance;
}

export function getPaymentLabel(account: Partial<MetaAdAccount>): string {
    if (account.is_prepay_account) {
        return "Pré-pago";
    }
    if (account.funding_source_details?.display_string?.toLowerCase().includes("visa") ||
        account.funding_source_details?.display_string?.toLowerCase().includes("mastercard") ||
        account.funding_source_details?.type === "1") {
        return "Cartão de Crédito";
    }
    return "Faturamento Automático";
}
