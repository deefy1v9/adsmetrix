-- Balance alert fields on Account (per-account config)
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "balance_alert_enabled"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "balance_alert_threshold"    DOUBLE PRECISION NOT NULL DEFAULT 200.0,
  ADD COLUMN IF NOT EXISTS "balance_alert_last_sent_at" TIMESTAMP(3);

-- Balance alert group destination on Setting (per-workspace config)
ALTER TABLE "Setting"
  ADD COLUMN IF NOT EXISTS "balance_alert_group_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "balance_alert_group_name" TEXT;
