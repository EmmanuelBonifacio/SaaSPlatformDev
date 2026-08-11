-- =============================================================================
-- Migration: add-module-flags
-- Adiciona flags de visibilidade e controle por módulo/tenant.
--
-- Aplique com:
--   psql $DATABASE_URL -f src/migrations/add-module-flags.sql
--
-- Ordem de execução é importante:
--   1. Adicionar icone aos módulos
--   2. Adicionar flags ao tenant_modules (com DEFAULT seguros — não quebra registros existentes)
--   3. Criar tabela de planos
--   4. Adicionar colunas de plano aos tenants
--   5. Inserir planos padrão
-- =============================================================================

-- ── 1. Ícone no catálogo de módulos ──────────────────────────────────────────
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS icone VARCHAR(50);

-- ── 2. Flags de visibilidade/trial por tenant-módulo ─────────────────────────
-- DEFAULT safe: existentes ficam visíveis (true) sem badge nenhum (false/NULL)
ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS visivel          BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS em_breve         BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta             BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ate        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo TEXT;

-- ── 3. Planos de assinatura ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planos (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(100) NOT NULL UNIQUE,
  descricao    TEXT,
  preco_mensal DECIMAL(10,2) NOT NULL DEFAULT 0,
  modulos      TEXT[]        NOT NULL DEFAULT '{}',
  ativo        BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 4. Plano atual do tenant ──────────────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plano_id   UUID REFERENCES planos(id),
  ADD COLUMN IF NOT EXISTS plano_ate  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS em_trial   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_dias INTEGER NOT NULL DEFAULT 14;

-- ── 5. Planos padrão ─────────────────────────────────────────────────────────
INSERT INTO planos (nome, descricao, preco_mensal, modulos) VALUES
  ('starter',    'Plano inicial',       0,   ARRAY['estoque', 'financeiro']),
  ('pro',        'Plano profissional',  197, ARRAY['estoque', 'financeiro', 'vendas', 'fleet']),
  ('enterprise', 'Plano completo',      497, ARRAY['estoque', 'financeiro', 'vendas', 'fleet', 'tv', 'app_motorista'])
ON CONFLICT (nome) DO NOTHING;
