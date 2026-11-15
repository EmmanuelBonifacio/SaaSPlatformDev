const SAFE_SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

export function buildClientsTenantSchemaSQL(schemaName: string): string[] {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error("Nome de schema inválido para as tabelas de clientes.");
  }

  return [
    `CREATE TABLE IF NOT EXISTS "${schemaName}".crm_clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_key VARCHAR(220) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'lead'
        CONSTRAINT crm_clients_status_check CHECK (
          status IN ('lead', 'proposta', 'ativo', 'churn', 'vip')
        ),
      nome_fantasia VARCHAR(160) NOT NULL,
      cnpj_cpf VARCHAR(32),
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      origem VARCHAR(32)
        CONSTRAINT crm_clients_origem_check CHECK (
          origem IS NULL OR origem IN ('instagram', 'indicacao', 'trafego', 'outro')
        ),
      plano VARCHAR(24)
        CONSTRAINT crm_clients_plano_check CHECK (
          plano IS NULL OR plano IN ('free', 'pro', 'premium')
        ),
      mrr NUMERIC(12, 2) NOT NULL DEFAULT 0,
      responsavel VARCHAR(120),
      whatsapp VARCHAR(40),
      email VARCHAR(180),
      produto_contratado VARCHAR(240),
      dor_principal TEXT,
      objetivo_saas TEXT,
      modulos JSONB NOT NULL DEFAULT '{}'::jsonb,
      dashboard_link VARCHAR(500),
      external_id VARCHAR(120),
      notas_relatorio TEXT,
      created_by VARCHAR(255) NOT NULL,
      updated_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT crm_clients_match_key_unique UNIQUE (match_key)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_crm_clients_status_updated
      ON "${schemaName}".crm_clients (status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_crm_clients_nome
      ON "${schemaName}".crm_clients (lower(nome_fantasia))`,
  ];
}
