ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "combined_report_enabled" BOOLEAN NOT NULL DEFAULT false;
