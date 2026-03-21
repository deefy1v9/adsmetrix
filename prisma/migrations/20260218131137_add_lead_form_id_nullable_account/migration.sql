-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "client_name" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "amount_spent" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "account_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_prepay" BOOLEAN NOT NULL DEFAULT false,
    "access_token" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "jupiter_ticket_id" TEXT,
    "daily_report_enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_report_time" TEXT NOT NULL DEFAULT '09:00',
    "daily_report_range" TEXT NOT NULL DEFAULT 'today',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "last_report_sent_at" DATETIME,
    "google_chat_webhook" TEXT,
    "google_chat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "google_chat_time" TEXT NOT NULL DEFAULT '09:00',
    "google_chat_range" TEXT NOT NULL DEFAULT 'today',
    "google_chat_type" TEXT NOT NULL DEFAULT 'text'
);

-- CreateTable
CREATE TABLE "JupiterConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiUrl" TEXT NOT NULL DEFAULT 'https://api-grupodpg.zapcontabil.chat',
    "apiToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "account_id" TEXT,
    "campaign_id" TEXT,
    "campaign_name" TEXT,
    "adset_id" TEXT,
    "adset_name" TEXT,
    "ad_id" TEXT,
    "ad_name" TEXT,
    "form_id" TEXT,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "created_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "raw_data" TEXT,
    "synced_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" REAL NOT NULL DEFAULT 0,
    "cpm" REAL NOT NULL DEFAULT 0,
    "cpc" REAL NOT NULL DEFAULT 0,
    "ctr" REAL NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cost_per_conversion" REAL NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "synced_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_account_id_key" ON "Account"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_lead_id_key" ON "Lead"("lead_id");

-- CreateIndex
CREATE INDEX "Lead_account_id_idx" ON "Lead"("account_id");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaign_id_key" ON "Campaign"("campaign_id");

-- CreateIndex
CREATE INDEX "Campaign_account_id_idx" ON "Campaign"("account_id");
