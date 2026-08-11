# Plano: Robô de Atendimento WhatsApp + Integração Delivery

## Contexto

O sistema já possui um módulo de vendas funcional (Fastify + PostgreSQL multi-tenant) com tabelas de pedidos, produtos e um webhook `/vendas/webhook/whatsapp` que existe mas é um stub. O objetivo é transformar esse stub em um robô completo que atenda pedidos recebidos via WhatsApp, processe pagamento via PIX automático e despache o entregador — tudo orquestrado pelo n8n rodando na mesma VPS do SaaS.

---

## Arquitetura Geral

```
[Cliente WhatsApp]
        ↓ mensagem
[Meta Cloud API Webhook]
        ↓ POST
[n8n - Workflow "Atendimento"]
        ↓ HTTP Request
[Backend Fastify /vendas/n8n/*]  ←→  [PostgreSQL multi-tenant]
        ↓                                    ↑
[Asaas - PIX]     [Lalamove - Entrega]  [Webhook callbacks]
        ↓                   ↓
[n8n - Workflow "Pagamento"] [n8n - Workflow "Entrega"]
        ↓                           ↓
[WhatsApp → Cliente: status updates]
```

---

## Stack de Integração

| Componente | Escolha | Motivo |
|---|---|---|
| Orquestrador | **n8n** (self-hosted, Docker) | Visual, open source, webhooks nativos, nodes HTTP |
| WhatsApp | **Meta Cloud API** | Confiável, sem risco de ban, API oficial |
| Pagamento PIX | **Asaas** | Melhor para Brasil, PIX nativo, webhook robusto, plano grátis para começar |
| Delivery | **Lalamove** | Opera em SP/RJ/BH/BSB/CWB/POA, API REST bem documentada, paga por corrida |
| IA fallback | **Claude API** (claude-haiku-4-5) | Barato, entende português, guia o cliente de volta ao fluxo |

---

## Fase 1: Infraestrutura — n8n no Docker

### Arquivo: `docker-compose.yml`
Adicionar serviço n8n ao compose existente:

```yaml
n8n:
  image: n8nio/n8n:latest
  container_name: n8n_dev
  restart: unless-stopped
  ports:
    - "5678:5678"
  environment:
    N8N_HOST: ${N8N_HOST:-localhost}
    N8N_PORT: 5678
    N8N_PROTOCOL: https
    WEBHOOK_URL: ${N8N_WEBHOOK_URL}         # URL pública do n8n
    N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
    DB_TYPE: postgresdb
    DB_POSTGRESDB_HOST: postgres
    DB_POSTGRESDB_PORT: 5432
    DB_POSTGRESDB_DATABASE: n8n_db
    DB_POSTGRESDB_USER: ${POSTGRES_USER:-postgres}
    DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
  volumes:
    - n8n_data:/home/node/.n8n
  depends_on:
    postgres:
      condition: service_healthy
  networks:
    - saas_dev_net
```

### Variáveis de ambiente novas no `.env`:
```
N8N_WEBHOOK_URL=https://seudominio.com/n8n
N8N_ENCRYPTION_KEY=chave-aleatoria-32-chars
META_WA_TOKEN=seu-token-meta
META_WA_PHONE_NUMBER_ID=seu-phone-id
ASAAS_API_KEY=sua-chave-asaas
LALAMOVE_API_KEY=sua-chave-lalamove
LALAMOVE_API_SECRET=seu-secret-lalamove
N8N_API_KEY=chave-interna-para-backend-chamar-n8n
```

---

## Fase 2: Banco de Dados — Migração `venda_pedidos`

### Arquivo: `apps/backend/src/core/tenant/tenant.provisioner.ts`

Adicionar colunas à criação da tabela `venda_pedidos` (já existente no provisioner):

```sql
-- Dados do cliente
nome_cliente         VARCHAR(255),

-- Pagamento
forma_pagamento      VARCHAR(50),           -- pix | cartao | dinheiro
payment_provider_id  VARCHAR(255),          -- ID externo no Asaas
pix_copia_cola       TEXT,                  -- código PIX copia-e-cola
pix_qr_code_url      TEXT,                  -- URL da imagem QR code
payment_expires_at   TIMESTAMPTZ,           -- expiração do PIX

-- Entrega
delivery_provider    VARCHAR(50),           -- lalamove | proprio
delivery_external_id VARCHAR(255),          -- ID da corrida na Lalamove
delivery_tracking_url TEXT,                 -- link de rastreamento
delivery_status      VARCHAR(50),           -- solicitado | coletado | entregue

-- Conversa
conversa_json        JSONB DEFAULT '[]'     -- histórico [{role, text, ts}]
```

> **Tenants já criados**: adicionar script de migração SQL em `apps/backend/src/core/tenant/tenant.migrator.ts` (novo arquivo) que executa `ALTER TABLE` para schemas existentes.

---

## Fase 3: Backend — Novos Endpoints para n8n

### Arquivo: `apps/backend/src/modules/vendas/vendas.routes.ts`
Adicionar grupo de rotas `/vendas/n8n/*` protegidas por API Key (header `x-n8n-key`):

```
GET  /vendas/n8n/pedido?whatsapp=5511999999999
     → Retorna pedido ativo (status != finalizado|cancelado) do número

POST /vendas/n8n/pedido
     → Cria ou atualiza pedido vindo do n8n
     Body: { numero_whatsapp, nome_cliente, itens_json, total, forma_pagamento, notas }

PATCH /vendas/n8n/pedido/:id/pagamento
      → Atualiza dados de pagamento
      Body: { payment_provider_id, pix_copia_cola, pix_qr_code_url, payment_expires_at, status }

PATCH /vendas/n8n/pedido/:id/entrega
      → Atualiza dados de entrega
      Body: { delivery_provider, delivery_external_id, delivery_tracking_url, delivery_status }

POST /vendas/n8n/pedido/:id/mensagem
     → Appenda mensagem ao conversa_json (histórico)
     Body: { role: 'bot'|'cliente', text }
```

### Webhooks públicos (sem JWT, validação por assinatura HMAC):
```
POST /vendas/webhooks/pagamento   → Asaas callback
POST /vendas/webhooks/entrega     → Lalamove callback
```

### Novos arquivos a criar:
- `apps/backend/src/modules/vendas/vendas.n8n.controller.ts` — handlers dos endpoints n8n
- `apps/backend/src/modules/vendas/vendas.webhooks.controller.ts` — handlers dos webhooks externos
- `apps/backend/src/modules/vendas/vendas.n8n.repository.ts` — queries específicas para n8n
- `apps/backend/src/core/middleware/n8n.middleware.ts` — validação do header `x-n8n-key`

---

## Fase 4: n8n — Três Workflows

### Workflow 1: "Atendimento WhatsApp"
**Trigger**: Webhook Meta Cloud API → n8n  
**Lógica**:
1. Extrair `phone`, `message_text`, `message_type`
2. `GET /vendas/n8n/pedido?whatsapp=phone` → busca pedido ativo
3. **Se não existe pedido ativo**: saudar e pedir detalhes do pedido
4. **Conversa guiada por estado** (status do pedido):
   - `pendente` (sem forma_pagamento): perguntar forma de pagamento (botões PIX/Dinheiro)
   - `pendente` (com PIX gerado): lembrar do código PIX e reenviar
   - Mensagem fora do script → nó **Claude Haiku** → resposta natural → guia de volta ao fluxo
5. Ao cliente confirmar itens: `POST /vendas/n8n/pedido` → criar pedido
6. Se escolheu PIX: chamar Asaas API → criar cobrança PIX → `PATCH /pedido/pagamento` → enviar código ao cliente

### Workflow 2: "Confirmação de Pagamento"  
**Trigger**: Webhook Asaas (`POST /vendas/webhooks/pagamento`)  
**Lógica**:
1. Validar assinatura HMAC do Asaas
2. Se `event = PAYMENT_RECEIVED`:
   - `PATCH /vendas/n8n/pedido/:id/pagamento` → status `pago`
   - Enviar via Meta API: "Pagamento confirmado! Preparando seu pedido..."
   - Chamar **Lalamove API** → criar ordem de coleta/entrega
   - `PATCH /vendas/n8n/pedido/:id/entrega` → salvar `delivery_external_id`
   - Enviar: "Entregador alocado! Ele está a caminho de nós."

### Workflow 3: "Status da Entrega"
**Trigger**: Webhook Lalamove (`POST /vendas/webhooks/entrega`)  
**Lógica**:
1. Extrair `delivery_id`, `status`
2. `GET /vendas/n8n/pedido?delivery_id=X` → busca pedido
3. Se `status = PICKED_UP`:
   - `PATCH /pedido/entrega` → `delivery_status = coletado`, `status = enviado`
   - Enviar: "Pedido a caminho! Rastreie aqui: [link]"
4. Se `status = COMPLETED`:
   - `PATCH /pedido` → `status = finalizado`
   - Enviar: "Pedido entregue! Obrigado pela preferência. Avalie nosso serviço!"

---

## Fase 5: Frontend Admin — Detalhes do Pedido

### Arquivo: `apps/frontend/src/modules/vendas/` (componente de detalhe do pedido)

Adicionar na tela de detalhes do pedido:
- **Tab "Conversa"**: renderizar `conversa_json` como timeline de chat
- **Tab "Pagamento"**: mostrar status PIX, ID externo, data expiração
- **Tab "Entrega"**: mostrar status Lalamove, link de rastreamento, delivery_id

---

## Fluxo Completo — Exemplo Real

```
Cliente: "Oi, quero fazer um pedido"
Bot:     "Olá! Você tem um pedido no valor de R$108,00 pendente.
          Como deseja pagar?"
         [Botão: PIX] [Botão: Dinheiro na entrega]

Cliente: → clica "PIX"
Bot:     "Perfeito! Aqui está seu PIX:
          00020126... (copia-e-cola)
          Válido por 30 minutos."

[Asaas detecta pagamento → webhook n8n]

Bot:     "Pagamento de R$108,00 confirmado!
          Estamos preparando seu pedido."

[n8n chama Lalamove → entregador alocado]

Bot:     "Entregador a caminho até nós!
          Aguarde, em breve saímos para entrega."

[Lalamove webhook: PICKED_UP]

Bot:     "Pedido saiu para entrega!
          Acompanhe em tempo real: https://lalamove.com/track/XXX
          Previsão: ~25 min"

[Lalamove webhook: COMPLETED]

Bot:     "Pedido entregue com sucesso!
          Obrigado pela preferência!"
```

---

## Arquivos Críticos a Modificar

| Arquivo | Tipo de Mudança |
|---|---|
| `docker-compose.yml` | Adicionar serviço n8n |
| `apps/backend/src/core/tenant/tenant.provisioner.ts` | Adicionar colunas à venda_pedidos |
| `apps/backend/src/modules/vendas/vendas.routes.ts` | Registrar novas rotas n8n e webhooks |
| `apps/backend/.env` (+ `.env.example`) | Novas variáveis de ambiente |

## Novos Arquivos a Criar

| Arquivo | Propósito |
|---|---|
| `apps/backend/src/core/tenant/tenant.migrator.ts` | Migrar tenants existentes |
| `apps/backend/src/core/middleware/n8n.middleware.ts` | Auth API Key para n8n |
| `apps/backend/src/modules/vendas/vendas.n8n.controller.ts` | Handlers endpoints n8n |
| `apps/backend/src/modules/vendas/vendas.n8n.repository.ts` | Queries para n8n |
| `apps/backend/src/modules/vendas/vendas.webhooks.controller.ts` | Handlers webhooks externos |
| `apps/backend/src/modules/vendas/vendas.asaas.service.ts` | Integração Asaas PIX |
| `apps/backend/src/modules/vendas/vendas.lalamove.service.ts` | Integração Lalamove |
| `n8n/workflows/atendimento-whatsapp.json` | Export do workflow n8n (versionado no git) |
| `n8n/workflows/confirmacao-pagamento.json` | Export do workflow n8n |
| `n8n/workflows/status-entrega.json` | Export do workflow n8n |

---

## Repositórios Open Source para Aproveitar

| Repo | Uso |
|---|---|
| `n8nio/n8n` | Orquestrador principal (Docker image) |
| `n8n-io/n8n-nodes-whatsapp` | Nó nativo Meta Cloud API no n8n |
| `AsaasPayments/asaas-node-sdk` | SDK oficial Asaas (npm) |
| Lalamove REST API | Sem SDK oficial; usar HTTP Request node do n8n + `node-fetch` no backend |

---

## Verificação / Testes

1. **n8n rodando**: acessar `http://localhost:5678`, importar os 3 workflows JSON
2. **Endpoint de teste**: `POST /vendas/n8n/pedido` com curl e `x-n8n-key` válido → pedido criado no banco
3. **Webhook Asaas**: usar ngrok em dev para testar callback local
4. **Webhook Lalamove**: usar Lalamove sandbox + ngrok
5. **Fluxo completo**: simular com número de teste da Meta Cloud API (modo sandbox)
6. **Painel admin**: verificar tab Conversa e tab Entrega no detalhe do pedido

---

## Ordem de Implementação Sugerida

1. Docker: adicionar n8n ao compose, subir e verificar UI
2. Banco: adicionar colunas ao provisioner + script migrator
3. Backend: middleware n8n-key + endpoints `/vendas/n8n/*`
4. Backend: webhooks `/vendas/webhooks/pagamento` e `/entrega`
5. Servicos: `vendas.asaas.service.ts` e `vendas.lalamove.service.ts`
6. n8n: criar Workflow 1 (Atendimento) e testar com Postman
7. n8n: criar Workflow 2 (Pagamento) + testar Asaas sandbox
8. n8n: criar Workflow 3 (Entrega) + testar Lalamove sandbox
9. Frontend: tabs de detalhe do pedido (Conversa, Pagamento, Entrega)
10. Integração E2E: teste com número real Meta sandbox
