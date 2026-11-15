/**
 * Referência de schema para o fork EmmanuelBonifacio/paperclip.
 * Worker servidor: adaptar ao estilo drizzle do repo (imports, companies FK).
 *
 * Persistência: apenas key_hash (SHA-256 hex). Nunca armazene a chave em claro.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export type AgentSdkKeyScopes = {
  scopes: Array<
    | "agents:read"
    | "tasks:read"
    | "tasks:write"
    | "comments:write"
    | "agents:run"
  >;
};

export const agentSdkKeys = pgTable(
  "agent_sdk_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    /** Escopos concedidos; menor privilégio por chave. */
    scopes: jsonb("scopes").$type<AgentSdkKeyScopes>().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyHashIdx: uniqueIndex("agent_sdk_keys_key_hash_idx").on(table.keyHash),
    companyIdx: index("agent_sdk_keys_company_idx").on(table.companyId),
  }),
);
