-- Placeholder: numerar conforme o journal do fork EmmanuelBonifacio/paperclip
-- (upstream público mais recente visto: 0487_*; o fork local pode já ter 0480_* diferente).
-- NÃO reutilize tags de migrations existentes. NÃO edite 0466/0467.
-- Aplicar via fluxo drizzle generate/migrate do próprio repo.

CREATE TABLE IF NOT EXISTS "agent_sdk_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_sdk_keys_key_hash_idx" ON "agent_sdk_keys" USING btree ("key_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sdk_keys_company_idx" ON "agent_sdk_keys" USING btree ("company_id");
