-- Add per-campaign metrics overrides to ReportAutomation
ALTER TABLE "ReportAutomation" ADD COLUMN "campaign_metrics" JSONB NOT NULL DEFAULT '{}';
