-- AlterTable: add per-workspace integration keys to Setting
ALTER TABLE "Setting" ADD COLUMN "criativo_art_api_key" TEXT;
ALTER TABLE "Setting" ADD COLUMN "jupiter_api_url" TEXT;
ALTER TABLE "Setting" ADD COLUMN "jupiter_api_token" TEXT;
