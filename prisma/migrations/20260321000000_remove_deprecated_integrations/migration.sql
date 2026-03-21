-- RemoveDeprecatedIntegrations: Google Chat, Jupiter/Zappy Contábil, Innovtalk, Email Reports

-- Remover colunas Jupiter/Zappy da tabela Account
ALTER TABLE "Account"
  DROP COLUMN IF EXISTS "jupiter_ticket_id",
  DROP COLUMN IF EXISTS "jupiter_connection_id",
  DROP COLUMN IF EXISTS "jupiter_api_url",
  DROP COLUMN IF EXISTS "jupiter_token",
  DROP COLUMN IF EXISTS "jupiter_message";

-- Remover colunas Google Chat da tabela Account
ALTER TABLE "Account"
  DROP COLUMN IF EXISTS "google_chat_webhook",
  DROP COLUMN IF EXISTS "google_chat_ticket_id",
  DROP COLUMN IF EXISTS "google_chat_enabled",
  DROP COLUMN IF EXISTS "google_chat_time",
  DROP COLUMN IF EXISTS "google_chat_range",
  DROP COLUMN IF EXISTS "google_chat_type",
  DROP COLUMN IF EXISTS "last_gc_report_sent_at";

-- Remover colunas Innovtalk da tabela Account
ALTER TABLE "Account"
  DROP COLUMN IF EXISTS "innovtalk_api_key",
  DROP COLUMN IF EXISTS "innovtalk_enabled",
  DROP COLUMN IF EXISTS "innovtalk_assistant_id",
  DROP COLUMN IF EXISTS "last_innovtalk_sync_at";

-- Remover colunas Email Reports da tabela Account
ALTER TABLE "Account"
  DROP COLUMN IF EXISTS "email_report_enabled",
  DROP COLUMN IF EXISTS "email_report_token",
  DROP COLUMN IF EXISTS "email_report_address",
  DROP COLUMN IF EXISTS "email_report_campaign_id",
  DROP COLUMN IF EXISTS "email_report_time",
  DROP COLUMN IF EXISTS "email_report_range",
  DROP COLUMN IF EXISTS "email_report_interval",
  DROP COLUMN IF EXISTS "email_report_custom_msg",
  DROP COLUMN IF EXISTS "last_email_report_sent_at";

-- Remover coluna Innovtalk da tabela Lead
ALTER TABLE "Lead"
  DROP COLUMN IF EXISTS "innovtalk_synced_at";

-- Remover colunas Jupiter da tabela Setting
ALTER TABLE "Setting"
  DROP COLUMN IF EXISTS "jupiter_api_url",
  DROP COLUMN IF EXISTS "jupiter_api_token";

-- Remover tabela JupiterConfig
DROP TABLE IF EXISTS "JupiterConfig";
