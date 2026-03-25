CREATE TABLE IF NOT EXISTS "ReportAutomation" (
    "id"             TEXT NOT NULL,
    "workspace_id"   TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "enabled"        BOOLEAN NOT NULL DEFAULT true,
    "account_ids"    JSONB NOT NULL DEFAULT '[]',
    "date_preset"    TEXT NOT NULL DEFAULT 'yesterday',
    "schedule_time"  TEXT NOT NULL DEFAULT '09:00',
    "metrics_config" JSONB NOT NULL DEFAULT '{}',
    "custom_message" TEXT,
    "last_sent_at"   TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReportAutomation_workspace_id_idx" ON "ReportAutomation"("workspace_id");

ALTER TABLE "ReportAutomation"
    ADD CONSTRAINT "ReportAutomation_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
