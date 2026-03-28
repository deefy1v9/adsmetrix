-- Add skip_weekends option to ReportAutomation
ALTER TABLE "ReportAutomation" ADD COLUMN "skip_weekends" BOOLEAN NOT NULL DEFAULT false;
