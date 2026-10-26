-- CreateTable
CREATE TABLE "GoogleAdsConnection" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "google_email" TEXT,
    "refresh_token" TEXT NOT NULL,
    "access_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "connected_by_user_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsAccount" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "descriptive_name" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'BRL',
    "time_zone" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "login_customer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENABLED',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT,
    "client_name" TEXT,
    "client_uri" TEXT,
    "logo_uri" TEXT,
    "redirect_uris" JSONB NOT NULL,
    "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'none',
    "is_metadata_document" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
    "scope" TEXT NOT NULL,
    "resource" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthGrant" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource" TEXT,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsConnection_workspace_id_key" ON "GoogleAdsConnection"("workspace_id");

-- CreateIndex
CREATE INDEX "GoogleAdsAccount_workspace_id_idx" ON "GoogleAdsAccount"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsAccount_workspace_id_customer_id_key" ON "GoogleAdsAccount"("workspace_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_client_id_key" ON "OAuthClient"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationCode_code_hash_key" ON "OAuthAuthorizationCode"("code_hash");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_client_id_idx" ON "OAuthAuthorizationCode"("client_id");

-- CreateIndex
CREATE INDEX "OAuthGrant_user_id_idx" ON "OAuthGrant"("user_id");

-- CreateIndex
CREATE INDEX "OAuthGrant_workspace_id_idx" ON "OAuthGrant"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_token_hash_key" ON "OAuthToken"("token_hash");

-- CreateIndex
CREATE INDEX "OAuthToken_grant_id_idx" ON "OAuthToken"("grant_id");

-- AddForeignKey
ALTER TABLE "GoogleAdsConnection" ADD CONSTRAINT "GoogleAdsConnection_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsAccount" ADD CONSTRAINT "GoogleAdsAccount_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "OAuthClient"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthGrant" ADD CONSTRAINT "OAuthGrant_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "OAuthClient"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthGrant" ADD CONSTRAINT "OAuthGrant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "OAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

