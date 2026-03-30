-- Add totals_only flag to ReportAutomation
ALTER TABLE "ReportAutomation" ADD COLUMN "totals_only" BOOLEAN NOT NULL DEFAULT false;
