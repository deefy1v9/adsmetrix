-- Add destination fields to ReportAutomation
ALTER TABLE "ReportAutomation" ADD COLUMN "destination_type" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ReportAutomation" ADD COLUMN "destination_id"   TEXT;
ALTER TABLE "ReportAutomation" ADD COLUMN "destination_name" TEXT;
