-- AlterTable: Add UazAPI fields to Setting model
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "uazapi_url" TEXT;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "uazapi_token" TEXT;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "uazapi_instance" TEXT;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "whatsapp_number" TEXT;
