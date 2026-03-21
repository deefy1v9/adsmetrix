/*
  Warnings:

  - You are about to drop the column `last_report_sent_at` on the `Account` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
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
    "last_wa_report_sent_at" DATETIME,
    "last_gc_report_sent_at" DATETIME,
    "google_chat_webhook" TEXT,
    "google_chat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "google_chat_time" TEXT NOT NULL DEFAULT '09:00',
    "google_chat_range" TEXT NOT NULL DEFAULT 'today',
    "google_chat_type" TEXT NOT NULL DEFAULT 'text',
    "jupiter_connection_id" INTEGER,
    "jupiter_api_url" TEXT,
    "jupiter_token" TEXT,
    "jupiter_message" TEXT
);
INSERT INTO "new_Account" ("access_token", "account_id", "account_name", "account_status", "amount_spent", "balance", "client_name", "created_at", "currency", "daily_report_enabled", "daily_report_range", "daily_report_time", "google_chat_enabled", "google_chat_range", "google_chat_time", "google_chat_type", "google_chat_webhook", "id", "is_hidden", "is_prepay", "jupiter_ticket_id", "updated_at") SELECT "access_token", "account_id", "account_name", "account_status", "amount_spent", "balance", "client_name", "created_at", "currency", "daily_report_enabled", "daily_report_range", "daily_report_time", "google_chat_enabled", "google_chat_range", "google_chat_time", "google_chat_type", "google_chat_webhook", "id", "is_hidden", "is_prepay", "jupiter_ticket_id", "updated_at" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_account_id_key" ON "Account"("account_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
