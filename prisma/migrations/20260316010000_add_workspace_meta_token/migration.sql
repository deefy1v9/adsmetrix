-- AlterTable: add meta_access_token to Workspace for per-workspace token isolation
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "meta_access_token" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "meta_token_updated_at" TIMESTAMP(3);
