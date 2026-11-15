// =============================================================================
// src/core/tenant/tenant.provisioner.ts
// =============================================================================
// O QUE FAZ:
//   É o "construtor de apartamentos" do sistema. Quando um novo cliente
//   (tenant) é cadastrado, este serviço:
//   1. Cria um schema isolado no PostgreSQL (ex: "tenant_acme_corp")
//   2. Cria TODAS as tabelas dos módulos disponíveis dentro desse schema
//   3. Registra o tenant e seus módulos ativos na tabela public.tenants
//
// POR QUE EXISTE ESTE ARQUIVO?
//   O Prisma ORM gerencia migrations apenas para o schema 'public'.
//   As tabelas dentro dos schemas de tenant (products, transactions, etc.)
//   precisam ser criadas via SQL puro, pois são criadas DINAMICAMENTE
//   quando cada cliente é provisionado.
//
// ANALOGIA PEDAGÓGICA:
//   O Prisma é o síndico do prédio (gerencia áreas comuns = schema public).
//   O TenantProvisioner é o mestre de obras que constrói o apartamento
//   (schema + tabelas) para cada novo morador (tenant).
//
// PRINCÍPIO SOLID (Open/Closed):
//   Para adicionar tabelas de novos módulos, basta adicionar o SQL em
//   TENANT_SCHEMA_SQL. Não é necessário alterar a lógica de provisionamento.
// =============================================================================

import { prisma } from "../database/prisma";
import { buildPaperclipTenantSchemaSQL } from "./paperclip-tenant-schema";
import { buildAgentsTenantSchemaSQL } from "./agents-tenant-schema";
import { buildMemoryTenantSchemaSQL } from "./memory-tenant-schema";

// =============================================================================
// CONSTANTE: TENANT_SCHEMA_SQL
// =============================================================================
// O QUE FAZ:
//   Define todo o SQL para criar as tabelas de TODOS os módulos disponíveis
//   dentro de um schema de tenant.
//
// POR QUE UMA FUNÇÃO E NÃO UMA STRING ESTÁTICA?
//   O nome do schema precisa ser interpolado dinamicamente.
//   PORÉM: para evitar SQL injection, esta função só é chamada APÓS
//   validateSchemaName() (no prisma.ts) ter validado o nome do schema.
//   O `schemaName` que chega aqui já foi sanitizado.
//
// POR QUE CREATE TABLE IF NOT EXISTS?
//   Torna o provisionamento IDEMPOTENTE: pode ser executado várias vezes
//   sem erros. Útil para reprocessar um tenant com falha no provisionamento.
// =============================================================================
function buildTenantSchemaSQL(schemaName: string): string[] {
  return [
    // -----------------------------------------------------------------
    // PASSO 1: Criar o Schema Isolado
    // -----------------------------------------------------------------
    // CREATE SCHEMA IF NOT EXISTS cria o "container" (schema/namespace)
    // no PostgreSQL. É o equivalente a criar uma pasta separada onde
    // todas as tabelas deste tenant estarão guardadas de forma isolada.
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,

    // -----------------------------------------------------------------
    // TABELA: products (Módulo de Estoque)
    // -----------------------------------------------------------------
    // Esta tabela SÓ EXISTE dentro do schema do tenant.
    // "tenant_acme.products" é COMPLETAMENTE separado de "tenant_foobar.products"
    // O PostgreSQL garante este isolamento em nível de kernel.
    `CREATE TABLE IF NOT EXISTS "${schemaName}".products (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      price       DECIMAL(10,2) NOT NULL DEFAULT 0.00
                  CONSTRAINT products_price_positive CHECK (price >= 0),
      quantity    INTEGER     NOT NULL DEFAULT 0
                  CONSTRAINT products_quantity_non_negative CHECK (quantity >= 0),
      sku         VARCHAR(100) UNIQUE,
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // Índice para acelerar buscas por nome de produto (ex: busca no catálogo)
    `CREATE INDEX IF NOT EXISTS idx_products_name
      ON "${schemaName}".products (name)`,

    // Índice para filtrar apenas produtos ativos (o caso mais comum de query)
    `CREATE INDEX IF NOT EXISTS idx_products_active
      ON "${schemaName}".products (is_active)
      WHERE is_active = true`,

    // -----------------------------------------------------------------
    // TABELA: transactions (Módulo Financeiro)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      type             VARCHAR(20) NOT NULL
                       CONSTRAINT transactions_type_check
                       CHECK (type IN ('receita', 'despesa')),
      -- 'receita' = entrada de dinheiro, 'despesa' = saída de dinheiro
      amount           DECIMAL(10,2) NOT NULL
                       CONSTRAINT transactions_amount_positive CHECK (amount > 0),
      description      TEXT        NOT NULL,
      category         VARCHAR(100),
      supplier         VARCHAR(150),
      cost_center      VARCHAR(100),
      transaction_date DATE        NOT NULL DEFAULT CURRENT_DATE,
      is_reconciled    BOOLEAN     NOT NULL DEFAULT false,
      -- is_reconciled: indica se a transação foi conferida no extrato bancário
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // Índice para filtrar transações por tipo (receita vs despesa)
    `CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON "${schemaName}".transactions (type)`,

    // Índice para busca por período (relatórios mensais/anuais)
    `CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON "${schemaName}".transactions (transaction_date DESC)`,

    // -----------------------------------------------------------------
    // TABELA: financial_commitments (Planejamento Financeiro)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".financial_commitments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      supplier VARCHAR(150),
      cost_center VARCHAR(100),
      type VARCHAR(30) NOT NULL
        CONSTRAINT financial_commitments_type_check
        CHECK (type IN ('conta_fixa_mensal','assinatura_mensal','parcelamento')),
      direction VARCHAR(20) NOT NULL DEFAULT 'despesa'
        CONSTRAINT financial_commitments_direction_check
        CHECK (direction IN ('receita','despesa')),
      amount DECIMAL(12,2) NOT NULL
        CONSTRAINT financial_commitments_amount_positive CHECK (amount > 0),
      start_date DATE NOT NULL,
      end_date DATE,
      due_day INTEGER NOT NULL
        CONSTRAINT financial_commitments_due_day_check CHECK (due_day BETWEEN 1 AND 31),
      installment_count INTEGER
        CONSTRAINT financial_commitments_installment_count_check CHECK (installment_count IS NULL OR installment_count >= 2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // -----------------------------------------------------------------
    // TABELA: financial_occurrences (competências previstas/pagas)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".financial_occurrences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      commitment_id UUID NOT NULL
        REFERENCES "${schemaName}".financial_commitments(id) ON DELETE CASCADE,
      competence_month DATE NOT NULL,
      due_date DATE NOT NULL,
      installment_number INTEGER NOT NULL DEFAULT 0,
      expected_amount DECIMAL(12,2) NOT NULL
        CONSTRAINT financial_occurrences_expected_amount_positive CHECK (expected_amount > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CONSTRAINT financial_occurrences_status_check
        CHECK (status IN ('pendente','pago','atrasado','cancelado')),
      paid_amount DECIMAL(12,2),
      paid_at DATE,
      transaction_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT financial_occurrences_unique UNIQUE (commitment_id, competence_month, installment_number)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_financial_occurrences_due_date
      ON "${schemaName}".financial_occurrences (due_date)`,

    `CREATE INDEX IF NOT EXISTS idx_financial_occurrences_status
      ON "${schemaName}".financial_occurrences (status)`,

    // -----------------------------------------------------------------
    // TABELA: financial_payments (baixas efetivas)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".financial_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      occurrence_id UUID NOT NULL UNIQUE
        REFERENCES "${schemaName}".financial_occurrences(id) ON DELETE CASCADE,
      paid_amount DECIMAL(12,2) NOT NULL
        CONSTRAINT financial_payments_paid_amount_positive CHECK (paid_amount > 0),
      penalty_amount DECIMAL(12,2) NOT NULL DEFAULT 0
        CONSTRAINT financial_payments_penalty_non_negative CHECK (penalty_amount >= 0),
      interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0
        CONSTRAINT financial_payments_interest_non_negative CHECK (interest_amount >= 0),
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0
        CONSTRAINT financial_payments_discount_non_negative CHECK (discount_amount >= 0),
      payment_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // -----------------------------------------------------------------
    // TABELA: financial_monthly_history (snapshot por mês)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".financial_monthly_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      month DATE NOT NULL UNIQUE,
      previsto DECIMAL(14,2) NOT NULL DEFAULT 0,
      pago DECIMAL(14,2) NOT NULL DEFAULT 0,
      pendente DECIMAL(14,2) NOT NULL DEFAULT 0,
      atrasado DECIMAL(14,2) NOT NULL DEFAULT 0,
      realizado_receitas DECIMAL(14,2) NOT NULL DEFAULT 0,
      realizado_despesas DECIMAL(14,2) NOT NULL DEFAULT 0,
      saldo_realizado DECIMAL(14,2) NOT NULL DEFAULT 0,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_financial_monthly_history_month
      ON "${schemaName}".financial_monthly_history (month DESC)`,

    // -----------------------------------------------------------------
    // TABELA: tv_devices (Módulo de Controle de Telas / Digital Signage)
    // -----------------------------------------------------------------
    // Armazena os dispositivos (Smart TVs, monitores) registrados pelo
    // tenant. Cada tenant tem seu próprio inventário de telas, isolado
    // dentro do seu schema.
    //
    // REGRA DE NEGÓCIO IMPORTANTE:
    //   Máximo de 5 dispositivos por tenant. Esta regra NÃO é enforçada
    //   por constraint no banco (para dar mensagem de erro amigável).
    //   É enforçada no tv.repository.ts antes do INSERT.
    //
    // CAMPOS:
    //   ip_address    -> IPv4 ou IPv6 da TV na rede local (deve ser único
    //                   por tenant, pois dois dispositivos não podem ter
    //                   o mesmo IP na mesma rede)
    //   mac_address   -> Endereço físico da placa de rede (para Wake-on-LAN)
    //   status        -> 'online' (respondendo a pings) | 'offline' (sem resposta)
    //   current_content -> última URL que foi enviada para a tela
    //   last_seen_at  -> timestamp da última resposta bem-sucedida ao enviar
    //                   um comando (atualizado automaticamente em POST /tv/control)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".tv_devices (
      id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      name            VARCHAR(100) NOT NULL,
      ip_address      VARCHAR(45)  NOT NULL,
      mac_address     VARCHAR(17),
      status          VARCHAR(20)  NOT NULL DEFAULT 'offline'
                      CONSTRAINT tv_devices_status_check
                      CHECK (status IN ('online', 'offline')),
      current_content TEXT,
      last_seen_at    TIMESTAMPTZ,
      --
      -- NOVOS CAMPOS — Integração Multi-Protocolo
      --
      -- chromecast_id: ID do dispositivo Chromecast na rede local.
      --   Ex: "Chromecast-Ultra-a8f2..." (vem da API Cast SDK).
      --   Necessário para envio via protocolo Chromecast sem precisar
      --   do IP: o Cast SDK faz o roteamento pelo receiver app ID.
      chromecast_id   VARCHAR(200),
      --
      -- socket_token: token UUID que autentica o app receptor (receiver.html)
      --   ao conectar ao WebSocket deste backend.
      --   POR QUE UM TOKEN SEPARADO E NÃO O JWT DO TENANT?
      --   O app receptor roda dentro do browser da TV, um ambiente sem
      --   usuário logado. Um token de sessão dedicado — rotacionável,
      --   revogável por device — é mais seguro e mais simples de gerenciar.
      socket_token    UUID         DEFAULT gen_random_uuid(),
      device_role     VARCHAR(20)  NOT NULL DEFAULT 'CLIENT'
                      CONSTRAINT tv_devices_device_role_check
                      CHECK (device_role IN ('CLIENT','PLATFORM_ADS')),
      --
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      -- IP único por tenant: dois devices não podem ter o mesmo IP no schema
      CONSTRAINT tv_devices_ip_unique UNIQUE (ip_address)
    )`,

    // Índice para buscar rapidamente dispositivos online (uso frequente no dashboard)
    `CREATE INDEX IF NOT EXISTS idx_tv_devices_status
      ON "${schemaName}".tv_devices (status)`,

    // -----------------------------------------------------------------
    // TABELA: tenant_tv_plan (Plano de TVs por tenant — Fase TV / Xibo)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".tenant_tv_plan (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_tier VARCHAR(10) NOT NULL
        CONSTRAINT tenant_tv_plan_tier_check
        CHECK (plan_tier IN ('THREE','FIVE','TEN','CUSTOM')),
      plan_mode VARCHAR(20) NOT NULL
        CONSTRAINT tenant_tv_plan_mode_check
        CHECK (plan_mode IN ('SELF','PARTNERSHIP','OWNER_PLACED')),
      max_client_tvs INTEGER NOT NULL DEFAULT 5,
      platform_screen_share_percent INTEGER DEFAULT 0,
      platform_profit_share_percent INTEGER DEFAULT 0,
      platform_reserved_tv_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // -----------------------------------------------------------------
    // TABELA: xibo_platform_ads (Anúncios plataforma — feed Xibo)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".xibo_platform_ads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo VARCHAR(255) NOT NULL,
      video_url TEXT NOT NULL,
      duracao_segundos INTEGER NOT NULL DEFAULT 30
        CONSTRAINT xibo_platform_ads_duration_check
        CHECK (duracao_segundos > 0 AND duracao_segundos <= 86400),
      thumb_url TEXT,
      ativo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_xibo_platform_ads_ativo
      ON "${schemaName}".xibo_platform_ads (ativo)
      WHERE ativo = true`,

    // -----------------------------------------------------------------
    // TABELA: tv_command_logs (Histórico de Comandos — Módulo TV)
    // -----------------------------------------------------------------
    // Registra cada vez que o tenant envia um comando para uma TV.
    // Mesmo quando a TV não responde (success=false), o log é gravado
    // para diagnóstico posterior.
    //
    // POR QUE NÃO TEM FOREIGN KEY PARA tv_devices?
    //   Se uma TV for removida (DELETE), ainda queremos manter o histórico
    //   de comandos enviados a ela para fins de auditoria. Com FK + ON DELETE
    //   CASCADE perderíamos esses registros. Armazenamos device_name de forma
    //   desnormalizada para não precisar fazer JOIN após a remoção.
    //
    // CAMPOS:
    //   device_id     -> UUID do dispositivo (sem FK — desacoplado do ciclo de vida da TV)
    //   device_name   -> nome da TV no momento do envio (para exibição histórica)
    //   content_url   -> URL enviada para a tela
    //   content_type  -> 'video' | 'image' | 'web'
    //   protocol_used -> 'upnp' | 'dial' | 'none' (qual protocolo foi usado)
    //   success       -> true se a TV respondeu ao comando, false se não respondeu
    //   error_message -> detalhe do erro quando success=false (para diagnóstico)
    //   sent_at       -> timestamp exato do envio
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".tv_command_logs (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id     UUID         NOT NULL,
      device_name   VARCHAR(100) NOT NULL,
      content_url   TEXT         NOT NULL,
      content_type  VARCHAR(20)  NOT NULL
                    CONSTRAINT tv_command_logs_type_check
                    CHECK (content_type IN ('video', 'image', 'web', 'timer', 'screen-share')),
      -- protocol_used expandido para cobrir todos os protocolos do waterfall:
      --   'websocket'   -> enviado via Socket.IO ao receiver.html na TV
      --   'chromecast'  -> enviado via Cast REST API
      --   'upnp'        -> enviado via SOAP AVTransport
      --   'dial'        -> enviado via DIAL HTTP POST
      --   'none'        -> todos os protocolos falharam
      protocol_used VARCHAR(20)
                    CONSTRAINT tv_command_logs_protocol_check
                    CHECK (protocol_used IN ('websocket','chromecast','upnp','dial','none') OR protocol_used IS NULL),
      success       BOOLEAN      NOT NULL,
      error_message TEXT,
      sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`,

    // Índice para buscar histórico de um device específico (ordenado do mais recente)
    `CREATE INDEX IF NOT EXISTS idx_tv_command_logs_device
      ON "${schemaName}".tv_command_logs (device_id, sent_at DESC)`,

    // -----------------------------------------------------------------
    // TABELA: media_files (Módulo de Mídia — Streaming & Digital Signage)
    // -----------------------------------------------------------------
    // Armazena os metadados de arquivos (vídeos e imagens) enviados via
    // upload pelo tenant. O arquivo físico fica no disco em /uploads/{slug}/.
    //
    // POR QUE GUARDAR SÓ METADADOS E NÃO O ARQUIVO NO BANCO?
    //   Armazenar BLOBs no banco infla seu tamanho, degrada performance de
    //   backups e impede uso de CDN. O padrão da indústria é salvar o arquivo
    //   em disco (ou S3/MinIO) e registrar apenas a URL no banco.
    //
    // CAMPOS:
    //   filename      -> nome único no disco (UUID + extensão) — evita colisões
    //   original_name -> nome original do arquivo (para exibição ao usuário)
    //   url           -> URL pública para acesso: /uploads/{tenantSlug}/{filename}
    //   mime_type     -> tipo MIME validado no upload (ex: video/mp4, image/jpeg)
    //   size_bytes    -> tamanho em bytes (para exibir ao usuário e limitar storage)
    //   uploaded_by   -> UUID do usuário que fez o upload (auditoria)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".media_files (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      filename      VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      url           TEXT         NOT NULL,
      mime_type     VARCHAR(100) NOT NULL,
      size_bytes    BIGINT       NOT NULL DEFAULT 0,
      uploaded_by   UUID,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`,

    // Índice para listar mídias por data de upload (mais recentes primeiro)
    `CREATE INDEX IF NOT EXISTS idx_media_files_created
      ON "${schemaName}".media_files (created_at DESC)`,

    // -----------------------------------------------------------------
    // TABELA: users (Módulo de Autenticação)
    // -----------------------------------------------------------------
    // Armazena os usuários que fazem login no sistema para este tenant.
    // Cada tenant tem sua própria tabela de usuários, completamente
    // isolada dos outros tenants (schema-per-tenant).
    //
    // CAMPOS:
    //   email         -> identificador de login (único por tenant)
    //   password_hash -> NUNCA guardar senha em texto puro. Aqui fica
    //                   o hash bcrypt (custo 12) da senha do usuário.
    //   name          -> nome exibido na interface
    //   role          -> papel do usuário dentro do tenant:
    //                   'admin_tenant' = administrador do tenant
    //                   'user'         = usuário comum
    //   is_active     -> permite desativar um usuário sem deletar seus dados
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".users (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(100),
      role          VARCHAR(50)  NOT NULL DEFAULT 'user',
      is_active     BOOLEAN      NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT users_email_unique UNIQUE (email)
    )`,

    // Índice para login rápido por email (operação mais frequente)
    `CREATE INDEX IF NOT EXISTS idx_users_email
      ON "${schemaName}".users (email)`,

    // Índice para filtrar apenas usuários ativos
    `CREATE INDEX IF NOT EXISTS idx_users_active
      ON "${schemaName}".users (is_active)
      WHERE is_active = true`,

    // -----------------------------------------------------------------
    // TABELA: refresh_tokens (Módulo de Autenticação — Abordagem Híbrida)
    // -----------------------------------------------------------------
    // Armazena os refresh tokens da abordagem híbrida de autenticação.
    //
    // POR QUE GUARDAR O HASH E NÃO O TOKEN ORIGINAL?
    //   O refresh_token em si é uma string longa e aleatória enviada ao
    //   cliente. Se o banco for comprometido, o atacante NÃO consegue
    //   usar os tokens (apenas os hashes). Mesmo princípio do bcrypt
    //   para senhas, porém aqui usamos SHA-256 (mais rápido, token já
    //   é aleatório e longo o suficiente — não precisa de salt).
    //
    // ROTAÇÃO DE TOKENS (segurança extra):
    //   A cada /auth/refresh, o token antigo é revogado e um novo par
    //   é emitido. Se um token antigo for usado novamente, identificamos
    //   possível roubo e podemos revogar TODA a família de tokens.
    //
    // CAMPOS:
    //   token_hash    -> SHA-256 do refresh token (não o token em si)
    //   expires_at    -> timestamp de expiração (geralmente 30 dias)
    //   is_revoked    -> true se o token foi usado (rotação) ou invalidado (logout)
    //   ip_address    -> IP da requisição de login (auditoria)
    //   user_agent    -> browser/app usado no login (auditoria)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".refresh_tokens (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID         NOT NULL,
      token_hash  VARCHAR(64)  NOT NULL,
      expires_at  TIMESTAMPTZ  NOT NULL,
      is_revoked  BOOLEAN      NOT NULL DEFAULT false,
      ip_address  VARCHAR(45),
      user_agent  TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash),
      CONSTRAINT refresh_tokens_user_fk
        FOREIGN KEY (user_id) REFERENCES "${schemaName}".users(id)
        ON DELETE CASCADE
    )`,

    // Índice para busca rápida por hash (operação em todo /auth/refresh)
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
      ON "${schemaName}".refresh_tokens (token_hash)`,

    // Índice para limpeza periódica de tokens expirados / listagem por usuário
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON "${schemaName}".refresh_tokens (user_id)`,

    // -----------------------------------------------------------------
    // TABELA: venda_produtos (Módulo SalesWpp — Catálogo de Vendas)
    // -----------------------------------------------------------------
    // Armazena os produtos exibidos na página de vendas pública do tenant.
    // Cada tenant tem seu próprio catálogo, isolado no seu schema.
    //
    // CAMPOS:
    //   nome             -> nome do produto exibido no catálogo
    //   descricao        -> texto descritivo do produto
    //   preco            -> preço original
    //   preco_promocional-> preço com desconto (opcional — exibido em "Promoções")
    //   categoria        -> fileira onde o produto aparece (ex: lancamentos, mais-vendidos)
    //   foto_url         -> URL pública da imagem do produto
    //   ativo            -> controla se aparece no catálogo público (false = oculto)
    //   destaque         -> exibe em destaque dentro da categoria (topo da fileira)
    //   ordem            -> posição na fileira (menor valor = mais à esquerda)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".venda_produtos (
      id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      nome              VARCHAR(255)  NOT NULL,
      descricao         TEXT,
      preco             DECIMAL(10,2) NOT NULL DEFAULT 0.00
                        CONSTRAINT venda_produtos_preco_positivo CHECK (preco >= 0),
      preco_promocional DECIMAL(10,2)
                        CONSTRAINT venda_produtos_preco_promo_positivo CHECK (preco_promocional >= 0),
      categoria         VARCHAR(50)   NOT NULL DEFAULT 'lancamentos',
      foto_url          TEXT,
      ativo             BOOLEAN       NOT NULL DEFAULT true,
      destaque          BOOLEAN       NOT NULL DEFAULT false,
      ordem             INTEGER       NOT NULL DEFAULT 0,
      vendido_por_peso  BOOLEAN       NOT NULL DEFAULT false,
      created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )`,

    // Índice para listagem do catálogo público (produtos ativos por categoria)
    `CREATE INDEX IF NOT EXISTS idx_venda_produtos_catalogo
      ON "${schemaName}".venda_produtos (categoria, ativo, ordem ASC)`,

    // Índice para destaques (lançamentos em destaque aparecem primeiro)
    `CREATE INDEX IF NOT EXISTS idx_venda_produtos_destaque
      ON "${schemaName}".venda_produtos (destaque)
      WHERE destaque = true`,

    // -----------------------------------------------------------------
    // TABELA: venda_pedidos (Módulo SalesWpp — Pedidos via WhatsApp)
    // -----------------------------------------------------------------
    // Registra cada pedido iniciado pelo visitante ao clicar em
    // "Finalizar no WhatsApp". Permite ao admin acompanhar, marcar como
    // pago, enviado ou finalizado — e adicionar notas de entrega.
    //
    // POR QUE itens_json É JSONB E NÃO UMA TABELA SEPARADA?
    //   O carrinho é capturado no momento da compra (snapshot imutável).
    //   Se o produto for editado/deletado depois, o histórico do pedido
    //   deve preservar os preços e nomes originais do momento da venda.
    //   JSONB garante esse snapshot sem precisar de outra tabela.
    //
    // CAMPOS:
    //   numero_whatsapp -> telefone do comprador (pode ser null se não capturado)
    //   itens_json      -> snapshot do carrinho: [{produto_id, nome, preco, quantidade}]
    //   total           -> valor total do pedido no momento da compra
    //   status          -> ciclo de vida: pendente -> pago -> enviado -> finalizado
    //   notas           -> observações do admin (ex: "Entregue em 12/04", "Pix recebido")
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".venda_pedidos (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_whatsapp VARCHAR(20),
      itens_json      JSONB         NOT NULL DEFAULT '[]'::jsonb,
      total           DECIMAL(10,2) NOT NULL DEFAULT 0.00
                      CONSTRAINT venda_pedidos_total_positivo CHECK (total >= 0),
      status          VARCHAR(20)   NOT NULL DEFAULT 'pendente'
                      CONSTRAINT venda_pedidos_status_check
                      CHECK (status IN ('pendente', 'pago', 'enviado', 'finalizado', 'cancelado')),
      notas           TEXT,
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )`,

    // Índice para listar pedidos por status no painel admin
    `CREATE INDEX IF NOT EXISTS idx_venda_pedidos_status
      ON "${schemaName}".venda_pedidos (status, created_at DESC)`,

    // Índice para busca por número do WhatsApp (localizar pedidos de um cliente)
    `CREATE INDEX IF NOT EXISTS idx_venda_pedidos_whatsapp
      ON "${schemaName}".venda_pedidos (numero_whatsapp)
      WHERE numero_whatsapp IS NOT NULL`,

    // -----------------------------------------------------------------
    // TABELA: venda_config
    // -----------------------------------------------------------------
    // Configurações do módulo de vendas por tenant.
    // Sempre terá exatamente UMA linha (id = 1), garantido por CHECK constraint.
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".venda_config (
      id              INTEGER     PRIMARY KEY DEFAULT 1,
      whatsapp_number VARCHAR(20),
      nome_loja       VARCHAR(255),
      logo_url        VARCHAR(500),
      categorias      TEXT,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT venda_config_single_row CHECK (id = 1)
    )`,

    // Garante que a linha de configuração sempre exista
    `INSERT INTO "${schemaName}".venda_config (id)
      VALUES (1)
      ON CONFLICT DO NOTHING`,

    // Plano TV padrão (equivalente ao limite histórico de 5 TVs só cliente)
    `INSERT INTO "${schemaName}".tenant_tv_plan (
      plan_tier, plan_mode, max_client_tvs,
      platform_screen_share_percent, platform_profit_share_percent, platform_reserved_tv_count
    )
    SELECT 'CUSTOM', 'SELF', 5, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM "${schemaName}".tenant_tv_plan LIMIT 1)`,

    // -----------------------------------------------------------------
    // TABELA: vehicles (Módulo de Gestão de Frota)
    // -----------------------------------------------------------------
    // Registra os veículos da frota do tenant com referências opcionais
    // aos IDs externos nos engines Traccar, Fleetbase e Fleetms.
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".vehicles (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      plate               VARCHAR(20) NOT NULL,
      brand               VARCHAR(100),
      model               VARCHAR(100),
      year                INTEGER,
      color               VARCHAR(50),
      traccar_device_id   INTEGER,
      fleetbase_asset_id  TEXT,
      fleetms_vehicle_id  TEXT,
      status              VARCHAR(30) NOT NULL DEFAULT 'active'
                          CONSTRAINT vehicles_status_check
                          CHECK (status IN ('active','inactive','maintenance','decommissioned')),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_vehicles_plate
      ON "${schemaName}".vehicles (plate)`,

    `CREATE INDEX IF NOT EXISTS idx_vehicles_status
      ON "${schemaName}".vehicles (status)`,

    // -----------------------------------------------------------------
    // TABELA: drivers (Módulo de Gestão de Frota — Motoristas)
    // -----------------------------------------------------------------
    // Armazena motoristas localmente. Integração com Fleetbase é opcional.
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".drivers (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name                VARCHAR(255) NOT NULL,
      cpf                 VARCHAR(20),
      cnh                 VARCHAR(30),
      cnh_category        VARCHAR(5),
      cnh_expiry          DATE,
      phone               VARCHAR(20),
      email               VARCHAR(255),
      status              VARCHAR(20) NOT NULL DEFAULT 'active'
                          CONSTRAINT drivers_status_check
                          CHECK (status IN ('active','inactive','on_leave')),
      current_job_id      UUID,
      vehicle_id          UUID,
      fleetbase_driver_id TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_drivers_status
      ON "${schemaName}".drivers (status)`,

    `CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id
      ON "${schemaName}".drivers (vehicle_id)
      WHERE vehicle_id IS NOT NULL`,

    // -----------------------------------------------------------------
    // TABELA: maintenance_records (Módulo de Gestão de Frota — Manutenção)
    // -----------------------------------------------------------------
    // Registra ordens de manutenção e abastecimentos localmente.
    // Integração com Fleetms é opcional.
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".maintenance_records (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id        UUID        NOT NULL,
      type              VARCHAR(30) NOT NULL DEFAULT 'preventive'
                        CONSTRAINT maintenance_records_type_check
                        CHECK (type IN ('preventive','corrective','inspection','fuel','document')),
      description       TEXT        NOT NULL,
      status            VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                        CONSTRAINT maintenance_records_status_check
                        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
      scheduled_date    TIMESTAMPTZ,
      completed_date    TIMESTAMPTZ,
      cost              DECIMAL(10,2),
      odometer_km       INTEGER,
      fleetms_record_id TEXT,
      notes             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id
      ON "${schemaName}".maintenance_records (vehicle_id)`,

    `CREATE INDEX IF NOT EXISTS idx_maintenance_records_status
      ON "${schemaName}".maintenance_records (status)`,

    // -----------------------------------------------------------------
    // TABELA: dispatch_orders (Módulo de Despacho — persistência local)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".dispatch_orders (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id         UUID,
      vehicle_id        UUID,
      origin_address    TEXT        NOT NULL DEFAULT '',
      origin_lat        DECIMAL(10,7),
      origin_lng        DECIMAL(10,7),
      destination_address TEXT      NOT NULL DEFAULT '',
      destination_lat   DECIMAL(10,7),
      destination_lng   DECIMAL(10,7),
      description       TEXT,
      scheduled_at      TIMESTAMPTZ,
      priority          VARCHAR(20) NOT NULL DEFAULT 'medium'
                        CONSTRAINT dispatch_orders_priority_check
                        CHECK (priority IN ('low','medium','high','critical')),
      status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT dispatch_orders_status_check
                        CHECK (status IN ('pending','assigned','dispatched','in_transit','arrived','completed','cancelled')),
      route_id          UUID,
      route_sequence    INTEGER,
      fleetbase_order_id TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_dispatch_orders_status
      ON "${schemaName}".dispatch_orders (status)`,

    `CREATE INDEX IF NOT EXISTS idx_dispatch_orders_driver_id
      ON "${schemaName}".dispatch_orders (driver_id)
      WHERE driver_id IS NOT NULL`,

    `CREATE INDEX IF NOT EXISTS idx_dispatch_orders_route_id
      ON "${schemaName}".dispatch_orders (route_id)
      WHERE route_id IS NOT NULL`,

    // -----------------------------------------------------------------
    // TABELA: route_sessions (Módulo Criar Rotas — sessões de otimização)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".route_sessions (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      nome_sessao      VARCHAR(200),
      operation_type   VARCHAR(20) NOT NULL DEFAULT 'delivery'
                       CONSTRAINT route_sessions_operation_type_check
                       CHECK (operation_type IN ('delivery','transport','collection','service')),
      operation_date   DATE        NOT NULL,
      depot_address    TEXT        NOT NULL,
      depot_lat        DECIMAL(10,7),
      depot_lng        DECIMAL(10,7),
      engine           VARCHAR(20) NOT NULL DEFAULT 'vroom'
                       CONSTRAINT route_sessions_engine_check
                       CHECK (engine IN ('vroom','ortools','combined')),
      status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                       CONSTRAINT route_sessions_status_check
                       CHECK (status IN ('draft','optimized','approved','dispatched')),
      created_by       UUID,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_route_sessions_status
      ON "${schemaName}".route_sessions (status)`,

    `CREATE INDEX IF NOT EXISTS idx_route_sessions_operation_date
      ON "${schemaName}".route_sessions (operation_date DESC)`,

    // -----------------------------------------------------------------
    // TABELA: routes (Módulo Criar Rotas — rotas geradas por sessão)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".routes (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id            UUID        NOT NULL,
      name                  VARCHAR(100) NOT NULL,
      vehicle_id            UUID,
      driver_id             UUID,
      total_distance_km     DECIMAL(8,2),
      estimated_duration_min INTEGER,
      status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CONSTRAINT routes_status_check
                            CHECK (status IN ('pending','approved','dispatched','completed')),
      color                 VARCHAR(7)  NOT NULL DEFAULT '#185FA5',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_routes_session_id
      ON "${schemaName}".routes (session_id)`,

    `CREATE INDEX IF NOT EXISTS idx_routes_status
      ON "${schemaName}".routes (status)`,

    // -----------------------------------------------------------------
    // TABELA: route_stops (Módulo Criar Rotas — paradas de cada rota)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".route_stops (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id             UUID        NOT NULL,
      sequence_order       INTEGER     NOT NULL,
      address              TEXT        NOT NULL,
      lat                  DECIMAL(10,7),
      lng                  DECIMAL(10,7),
      time_window_start    TIME,
      time_window_end      TIME,
      service_duration_min INTEGER     NOT NULL DEFAULT 5,
      weight_kg            DECIMAL(8,2),
      volume_m3            DECIMAL(8,3),
      required_skill       VARCHAR(100),
      status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CONSTRAINT route_stops_status_check
                           CHECK (status IN ('pending','completed','failed','skipped')),
      order_id             UUID,
      notes                TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_route_stops_route_id
      ON "${schemaName}".route_stops (route_id)`,

    `CREATE INDEX IF NOT EXISTS idx_route_stops_sequence
      ON "${schemaName}".route_stops (route_id, sequence_order)`,

    // -----------------------------------------------------------------
    // TABELA: route_stops (extensão para checkin do motorista)
    // Adiciona campos de checkin que o app mobile usa — idempotente.
    // -----------------------------------------------------------------
    `ALTER TABLE "${schemaName}".route_stops
      ADD COLUMN IF NOT EXISTS checkin_at   TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS checkin_lat  DECIMAL(10,7),
      ADD COLUMN IF NOT EXISTS checkin_lng  DECIMAL(10,7)`,

    // -----------------------------------------------------------------
    // TABELA: driver_ponto (Módulo App Mobile — Controle de Ponto)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_ponto (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id             UUID        NOT NULL,
      data                  DATE        NOT NULL DEFAULT CURRENT_DATE,
      entrada               TIMESTAMPTZ,
      saida                 TIMESTAMPTZ,
      pausas                JSONB       NOT NULL DEFAULT '[]'::jsonb,
      total_minutos         INTEGER,
      localizacao_entrada   POINT,
      localizacao_saida     POINT,
      observacao            TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT driver_ponto_unique_day UNIQUE (driver_id, data),
      CONSTRAINT driver_ponto_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id)
        ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_ponto_driver_data
      ON "${schemaName}".driver_ponto (driver_id, data DESC)`,

    // -----------------------------------------------------------------
    // TABELA: checklist_templates (templates configurados pela empresa)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".checklist_templates (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      nome        VARCHAR(200) NOT NULL,
      tipo        VARCHAR(50)  NOT NULL
                  CONSTRAINT checklist_templates_tipo_check
                  CHECK (tipo IN ('pre_viagem','pos_viagem','abastecimento','manutencao','entrega')),
      itens       JSONB        NOT NULL DEFAULT '[]'::jsonb,
      ativo       BOOLEAN      NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_checklist_templates_tipo
      ON "${schemaName}".checklist_templates (tipo)
      WHERE ativo = true`,

    `ALTER TABLE "${schemaName}".checklist_templates
       ADD COLUMN IF NOT EXISTS descricao TEXT,
       ADD COLUMN IF NOT EXISTS obrigatorio_em VARCHAR(20) NOT NULL DEFAULT 'manual'`,

    // -----------------------------------------------------------------
    // TABELA: checklist_respostas (respostas enviadas pelo motorista)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".checklist_respostas (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id    UUID        NOT NULL,
      driver_id      UUID        NOT NULL,
      veiculo_id     UUID,
      rota_id        UUID,
      stop_id        UUID,
      respostas      JSONB       NOT NULL DEFAULT '[]'::jsonb,
      status         VARCHAR(20) NOT NULL DEFAULT 'concluido'
                     CONSTRAINT checklist_respostas_status_check
                     CHECK (status IN ('pendente','concluido','com_problema')),
      latitude       DECIMAL(10,8),
      longitude      DECIMAL(11,8),
      assinatura_url TEXT,
      observacao     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT checklist_respostas_template_fk
        FOREIGN KEY (template_id) REFERENCES "${schemaName}".checklist_templates(id),
      CONSTRAINT checklist_respostas_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_checklist_respostas_driver
      ON "${schemaName}".checklist_respostas (driver_id, created_at DESC)`,

    `CREATE INDEX IF NOT EXISTS idx_checklist_respostas_rota
      ON "${schemaName}".checklist_respostas (rota_id)
      WHERE rota_id IS NOT NULL`,

    // -----------------------------------------------------------------
    // TABELA: driver_avisos (comunicados da empresa para motoristas)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_avisos (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo      VARCHAR(300) NOT NULL,
      conteudo    TEXT        NOT NULL,
      tipo        VARCHAR(30) NOT NULL DEFAULT 'informativo'
                  CONSTRAINT driver_avisos_tipo_check
                  CHECK (tipo IN ('informativo','urgente','procedimento')),
      para_todos  BOOLEAN     NOT NULL DEFAULT true,
      driver_ids  UUID[]      DEFAULT NULL,
      imagem_url  TEXT,
      data_expiry TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_avisos_tipo
      ON "${schemaName}".driver_avisos (tipo, created_at DESC)`,

    // -----------------------------------------------------------------
    // TABELA: driver_avisos_lidos (rastreamento de leitura)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_avisos_lidos (
      aviso_id    UUID        NOT NULL,
      driver_id   UUID        NOT NULL,
      lido_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (aviso_id, driver_id),
      CONSTRAINT driver_avisos_lidos_aviso_fk
        FOREIGN KEY (aviso_id) REFERENCES "${schemaName}".driver_avisos(id) ON DELETE CASCADE,
      CONSTRAINT driver_avisos_lidos_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id) ON DELETE CASCADE
    )`,

    // -----------------------------------------------------------------
    // TABELA: driver_location_history (histórico de GPS dos motoristas)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_location_history (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id   UUID        NOT NULL,
      rota_id     UUID,
      latitude    DECIMAL(10,8) NOT NULL,
      longitude   DECIMAL(11,8) NOT NULL,
      heading     DECIMAL(5,2),
      speed       DECIMAL(6,2),
      accuracy    DECIMAL(6,2),
      timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT driver_location_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_location_driver_ts
      ON "${schemaName}".driver_location_history (driver_id, timestamp DESC)`,

    // -----------------------------------------------------------------
    // TABELA: driver_abastecimentos (registro de abastecimentos)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_abastecimentos (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id       UUID        NOT NULL,
      veiculo_id      UUID,
      rota_id         UUID,
      data            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      litros          DECIMAL(8,2) NOT NULL
                      CONSTRAINT driver_abastecimentos_litros_check CHECK (litros > 0),
      valor_total     DECIMAL(10,2) NOT NULL
                      CONSTRAINT driver_abastecimentos_valor_check CHECK (valor_total > 0),
      km_atual        INTEGER,
      posto           VARCHAR(200),
      nota_fiscal     TEXT,
      foto_cupom_url  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT driver_abastecimentos_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_abastecimentos_driver
      ON "${schemaName}".driver_abastecimentos (driver_id, data DESC)`,

    // -----------------------------------------------------------------
    // TABELA: driver_ocorrencias (problemas/incidentes registrados)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_ocorrencias (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id   UUID        NOT NULL,
      veiculo_id  UUID,
      rota_id     UUID,
      tipo        VARCHAR(50) NOT NULL
                  CONSTRAINT driver_ocorrencias_tipo_check
                  CHECK (tipo IN ('mecanico','acidente','roubo','pneu','outros')),
      descricao   TEXT        NOT NULL,
      fotos_urls  TEXT[]      DEFAULT '{}',
      latitude    DECIMAL(10,8),
      longitude   DECIMAL(11,8),
      status      VARCHAR(20) NOT NULL DEFAULT 'aberto'
                  CONSTRAINT driver_ocorrencias_status_check
                  CHECK (status IN ('aberto','em_atendimento','resolvido')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT driver_ocorrencias_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id) ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_ocorrencias_driver
      ON "${schemaName}".driver_ocorrencias (driver_id, created_at DESC)`,

    `CREATE INDEX IF NOT EXISTS idx_driver_ocorrencias_status
      ON "${schemaName}".driver_ocorrencias (status)
      WHERE status = 'aberto'`,

    // -----------------------------------------------------------------
    // TABELA: driver_push_tokens (tokens Expo para notificações push)
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_push_tokens (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id   UUID        NOT NULL,
      token       TEXT        NOT NULL,
      platform    VARCHAR(10) NOT NULL DEFAULT 'unknown'
                  CONSTRAINT driver_push_tokens_platform_check
                  CHECK (platform IN ('ios','android','unknown')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (driver_id, token),
      CONSTRAINT driver_push_tokens_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id)
        ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_push_tokens_driver
      ON "${schemaName}".driver_push_tokens (driver_id)`,

    // -----------------------------------------------------------------
    // TABELA: driver_chat_messages (Chat motorista ↔ despachante)
    // Mantém retrocompatibilidade: tabela criada IF NOT EXISTS para
    // tenants provisionados antes da Fase 3.
    // -----------------------------------------------------------------
    `CREATE TABLE IF NOT EXISTS "${schemaName}".driver_chat_messages (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id   UUID        NOT NULL,
      sender_role VARCHAR(20) NOT NULL DEFAULT 'driver'
                  CONSTRAINT driver_chat_messages_sender_role_check
                  CHECK (sender_role IN ('driver','dispatcher')),
      content     TEXT        NOT NULL,
      tipo        VARCHAR(20) NOT NULL DEFAULT 'texto'
                  CONSTRAINT driver_chat_messages_tipo_check
                  CHECK (tipo IN ('texto','imagem','localizacao')),
      imagem_url  TEXT,
      latitude    DECIMAL(10,8),
      longitude   DECIMAL(11,8),
      lido        BOOLEAN     NOT NULL DEFAULT false,
      lido_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT driver_chat_messages_driver_fk
        FOREIGN KEY (driver_id) REFERENCES "${schemaName}".users(id)
        ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_driver_chat_driver_created
      ON "${schemaName}".driver_chat_messages (driver_id, created_at DESC)`,

    `CREATE INDEX IF NOT EXISTS idx_driver_chat_nao_lido
      ON "${schemaName}".driver_chat_messages (driver_id, lido)
      WHERE lido = false`,
    ...buildPaperclipTenantSchemaSQL(schemaName),
    ...buildAgentsTenantSchemaSQL(schemaName),
    ...buildMemoryTenantSchemaSQL(schemaName),
  ];
}

// =============================================================================
// TIPO: ProvisionTenantInput
// =============================================================================
// Define os dados necessários para provisionar um novo tenant.
// Usar um tipo explícito documenta o contrato e previne erros de TypeScript.
// =============================================================================
export interface ProvisionTenantInput {
  name: string;
  slug: string;
  schemaName: string;
  moduleNames?: string[]; // Quais módulos ativar; o padrão exclui Paperclip.
}

// =============================================================================
// TIPO: ProvisionedTenant
// =============================================================================
export interface ProvisionedTenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
}

// =============================================================================
// FUNÇÃO PRINCIPAL: provisionNewTenant
// =============================================================================
// O QUE FAZ:
//   Executa o processo completo de criação de um novo cliente:
//   1. Valida que o slug não está em uso (pré-check rápido)
//   2. Cria o schema e as tabelas no PostgreSQL via DDL direto
//   3. Registra o tenant e seus módulos numa transação curta e atômica
//
// POR QUE DDL FORA DA TRANSAÇÃO INTERATIVA DO PRISMA?
//   O Prisma impõe um timeout de 5s (padrão) na interactive transaction.
//   Com ~84 statements DDL (CREATE TABLE, CREATE INDEX, ALTER TABLE),
//   esse limite é ultrapassado mesmo em bancos rápidos.
//   Solução: executar DDL diretamente no cliente prisma (sem transação
//   interativa). O PostgreSQL garante atomicidade por statement, e todos
//   os statements usam IF NOT EXISTS → são idempotentes (re-executáveis).
//
// SOBRE A ATOMICIDADE:
//   - O pré-check de slug evita criação duplicada antes do DDL começar.
//   - Se o DDL falhar na metade, re-executar é seguro (IF NOT EXISTS).
//   - A transação rápida do Passo 3 garante que tenant + módulos sejam
//     criados ou não criados juntos (< 100ms → sem risco de timeout).
// =============================================================================
export async function provisionNewTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionedTenant> {
  const { name, slug, schemaName, moduleNames } = input;

  // PASSO 1: Pré-check de unicidade do slug (falha rápida antes do DDL)
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`Tenant com slug "${slug}" já existe.`);
  }

  // PASSO 2: Executa todo o DDL fora de transação interativa
  // Cada statement é atômico no PostgreSQL; IF NOT EXISTS garante idempotência.
  const schemaSQLStatements = buildTenantSchemaSQL(schemaName);
  for (const sql of schemaSQLStatements) {
    await prisma.$executeRawUnsafe(sql);
  }

  // PASSO 3: Registra tenant e módulos em transação curta (< 100ms, sem risco de timeout)
  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: { name, slug, schemaName },
    });

    const moduleFilter =
      moduleNames && moduleNames.length > 0
        ? { name: { in: moduleNames } }
        : { name: { notIn: ["paperclip"] } };

    const modules = await tx.module.findMany({
      where: moduleFilter,
      select: { id: true, name: true },
    });

    if (modules.length === 0 && moduleNames && moduleNames.length > 0) {
      throw new Error(
        `Nenhum dos módulos solicitados foi encontrado: ${moduleNames.join(", ")}`,
      );
    }

    await tx.tenantModule.createMany({
      data: modules.map((m) => ({
        tenantId: newTenant.id,
        moduleId: m.id,
        isEnabled: true,
      })),
      skipDuplicates: true,
    });

    return newTenant;
  });

  console.log(
    `[Provisioner] ✅ Tenant "${name}" provisionado com sucesso.\n` +
      `  Schema: ${schemaName}\n` +
      `  Módulos ativos: ${moduleNames?.length ? moduleNames.join(", ") : "padrão (Paperclip requer habilitação explícita)"}`,
  );

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    schemaName: tenant.schemaName,
  };
}
