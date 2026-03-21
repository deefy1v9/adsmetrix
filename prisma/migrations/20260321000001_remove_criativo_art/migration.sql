-- Remove Criativo Art API key from Setting table
ALTER TABLE "Setting"
  DROP COLUMN IF EXISTS "criativo_art_api_key";

-- Remove Criativo Art API key from GlobalConfig table
ALTER TABLE "GlobalConfig"
  DROP COLUMN IF EXISTS "criativo_art_api_key";
