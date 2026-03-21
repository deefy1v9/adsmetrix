declare module 'facebook-nodejs-business-sdk' {
    export class FacebookAdsApi {
        static init(accessToken: string): FacebookAdsApi;
    }
    export class AdAccount {
        constructor(id: string);
        getAdAccounts(fields: string[]): Promise<any[]>;
        getCampaigns(fields: string[], params?: any): Promise<any[]>;
        getAds(fields: string[], params?: any): Promise<any[]>;
    }
    export class Campaign {
        getInsights(fields: string[], params?: any): Promise<any[]>;
    }
    export class Ad {
        getLeads(fields: string[], params?: any): Promise<any[]>;
    }
    export class User {
        constructor(id: string);
        getAdAccounts(fields: string[]): Promise<any[]>;
        getAccounts(fields: string[]): Promise<any[]>;
    }
    export class Page {
        constructor(id: string);
        getLeadGenForms(fields: string[], params?: any): Promise<any[]>;
    }
    export class LeadGenForm {
        getLeads(fields: string[], params?: any): Promise<any[]>;
    }
    export interface Lead {
        id: string;
        created_time: string;
        field_data: Array<{ name: string; values: string[] }>;
    }
}
