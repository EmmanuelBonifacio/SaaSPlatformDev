# PRD — Módulo Cardápio / Pedidos (Delivery & Comércio)

> Documento vivo para montar e implementar o produto de cardápio digital + gestão de pedidos + cobrança pré-paga dentro do monorepo `SaaSPlatformDev`.
>
> **Status:** implementação iniciada em repositório separado  
> **Repositório do produto:** https://github.com/EmmanuelBonifacio/Platform-Card-pio  
> **Marca:** Platform Cardápio (arquitetura FoodFlow AI)  
> **Referência de mercado:** Pop Pedidos (`poppedidos.com`) — prints em `refs/`  
> **Débito de crédito:** somente no **aceite** do lojista  
> **Asaas:** fase final  
> **Última atualização:** 2026-11-19

---

## 1. Visão do produto

Plataforma SaaS multi-tenant para **restaurantes, lanchonetes e comércios** oferecerem:

1. **Cardápio digital** público (link/QR/subdomínio), com fotos e categorias.
2. **Gestão de pedidos** (delivery / retirada) no painel do lojista.
3. **Canais de pedido** (web + Bot WhatsApp).
4. **Cobrança pré-paga por volume de pedidos** (ciclo de 30 dias ou até esgotar créditos).
5. **Módulo Gestor** para o lojista mudar plano, recarregar e usar liberação em confiança sem perder vendas.

O produto entra como **módulo ativável por tenant** na plataforma existente (isolamento `tenant_<slug>`), reaproveitando a base `venda_*` e o catálogo global `planos` / `modules`.

**Nome comercial (pendente):** definir marca própria. Neste PRD usamos o nome técnico **Cardápio Pedidos**.

---

## 2. O que veio da referência (Pop Pedidos)

### 2.1 Planos comerciais (catálogo inicial sugerido)

| Plano | Preço (R$) | Volume no ciclo | Observação |
|-------|------------|-----------------|------------|
| Iniciante | 79,90 | Até 100 pedidos | Entrada |
| Essencial | 139,90 | Até 400 pedidos | Meio |
| Premium | 249,90 | Pedidos ilimitados | Topo |

> Valores e limites são **referência de mercado** (prints). Antes de ir a produção, confirmar preços/limites oficiais do negócio.

### 2.2 Features anunciadas (todos os planos na referência)

| Feature | Descrição curta | Prioridade MVP |
|---------|-----------------|----------------|
| Cardápio Digital | Interativo, configurável, com fotos | P0 |
| Gestão de Pedidos | Organizar/visualizar/controlar delivery | P0 |
| Bot WhatsApp | Automatizar atendimento e pedidos | P1 |
| Relatórios gerenciais de vendas | Detalhados e exportáveis | P1 |
| Plano de fidelidade | Recompensar compras / recorrência | P2 |
| Subdomínio próprio | `loja.seudominio.com` sem custo extra | P1 |
| Pixel de rastreamento | Meta/Google para tráfego | P2 |
| Treinamento com especialista | Conteúdo/onboarding online | P2 (conteúdo, não código core) |
| Suporte 8h–23:59 todos os dias | Operação / CS | Fora do escopo de código |

### 2.3 Modelo pré-pago (texto do negócio — regra oficial)

- Sistema **pré-pago**, gestão no **Módulo Gestor**.
- Cada plano tem **volume de pedidos a consumir em 30 dias**.
- Ao final de **30 dias** o plano **expira** → nova recarga para continuar.
- Se os créditos acabarem **antes** de 30 dias → nova recarga → **novo ciclo**.
- No Gestor o cliente pode:
  - **Mudar de plano** (upgrade/downgrade adequado à realidade).
  - **Recarregar** ao terminar créditos.
  - **Liberação em confiança** (evitar parada e perda de vendas).
- Pagamento online: **PIX**, **cartão débito/crédito**, **boleto**.
- Boleto pode demorar → preferir meios **instantâneos** (PIX/cartão) para não interromper operação.

### 2.4 Prints de referência

Arquivos em `docs/modules/cardapio-pedidos/refs/`:

- Planos Iniciante / Essencial / Premium
- Features: Cardápio, Gestão, Suporte, Bot WhatsApp, Relatórios, Fidelidade, Treinamento, Subdomínio, Pixel

---

## 3. Atores e papéis

| Ator | Onde age | Pode |
|------|----------|------|
| **Cliente final** | Cardápio público / WhatsApp | Ver cardápio, montar pedido, pagar (se habilitado), acompanhar status |
| **Lojista (tenant user)** | `/[slug]/cardapio/*` + Gestor | CRUD cardápio, gestão de pedidos, relatórios, planos/créditos |
| **Operador / cozinha** | Painel pedidos (role limitada) | Atualizar status do pedido |
| **Admin SaaS** | `/admin` | Ativar módulo, planos, liberação em confiança, suporte, CRM |
| **Sistema / webhooks** | Gateway pagamento, WhatsApp | Confirmar pagamento, debitar crédito, notificar |

---

## 4. Regras de negócio — créditos e ciclo

### 4.1 Definições

| Termo | Significado |
|-------|-------------|
| **Crédito de pedido** | 1 unidade consumida quando um pedido entra em estado **contabilizável** (ver 4.3) |
| **Ciclo** | Janela de até **30 dias** a partir da ativação/recarga paga (ou até zerar créditos) |
| **Saldo** | `limite_ciclo - consumidos_ciclo` (ilimitado = sem teto numérico) |
| **Bloqueio operacional** | Novo pedido **não** pode ser aceito/criado quando ciclo expirado **ou** saldo ≤ 0 (exceto liberação em confiança) |
| **Liberação em confiança** | Extensão temporária autorizada (admin ou política) permitindo operar sem saldo/ciclo válido |

### 4.2 Estados do tenant no módulo

```
trial → ativo → saldo_baixo → esgotado → bloqueado
                      ↓                      ↑
                 confiança ──────────────────┘
                      ↓
                   recarregado → ativo (novo ciclo)
```

| Estado | Comportamento |
|--------|---------------|
| `trial` | Operação liberada por N dias / M pedidos (configurável) |
| `ativo` | Ciclo válido e saldo > 0 (ou ilimitado) |
| `saldo_baixo` | Ativo, mas abaixo do limiar de alerta (ex.: ≤ 10%) |
| `esgotado` | Saldo 0 ou ciclo vencido; **bloqueia novos pedidos** |
| `confianca` | Operação liberada por prazo/limite extra; gera dívida/pendência de recarga |
| `bloqueado` | Admin suspendeu ou confiança expirou sem pagamento |

### 4.3 Quando debita 1 crédito

**Proposta (precisa aprovação):** debitar no momento em que o pedido passa de `rascunho`/`carrinho` para **`recebido`** (pedido confirmado no sistema), **não** no cancelamento precoce.

| Evento | Debita? |
|--------|---------|
| Cliente só abre o cardápio | Não |
| Pedido criado como recebido | **Sim** (1 crédito) |
| Pedido cancelado pelo lojista em &lt; X min | **Estorno opcional** (política) |
| Pedido cancelado pelo cliente antes do aceite | Não (se ainda não estava `recebido`) |
| Pedido Premium (ilimitado) | Não consome unidade (ou consome com teto “soft” só para métricas) |

### 4.4 Recarga e novo ciclo

1. Lojista escolhe plano (ou mesma faixa) no Gestor → gera cobrança.
2. Pagamento confirmado (webhook idempotente) →:
   - Cria novo registro de ciclo: `inicio`, `fim = inicio + 30d`, `limite_pedidos`, `consumidos = 0`.
   - Encerra ciclo anterior (se houver).
   - Remove flag de confiança / bloqueio.
3. Se pagamento for boleto: ciclo só libera após confirmação do gateway (estado `aguardando_pagamento`).

### 4.5 Mudança de plano

| Cenário | Regra proposta |
|---------|----------------|
| Upgrade no meio do ciclo | Cobra diferença pró-rata **ou** inicia ciclo novo do plano maior (escolher na implementação — **decisão aberta**) |
| Downgrade | Só no próximo ciclo; ou imediato com novo limite e saldo = min(saldo, novo_limite) |
| Migração Iniciante → Premium | Novo ciclo Premium após pagamento |

### 4.6 Liberação em confiança

- Quem autoriza: **admin SaaS** (e, opcionalmente, lojista com auto-confiança limitada se política permitir).
- Parâmetros: `validade_horas` (ex.: 24–72h) e/ou `pedidos_extra` (ex.: +20).
- Ao expirar sem recarga → `bloqueado`.
- Toda liberação gera **auditoria** (quem, quando, motivo, tenant).

---

## 5. Pagamentos (loja → plataforma)

| Meio | Liberação do ciclo | Risco de interrupção |
|------|--------------------|----------------------|
| PIX | Quase imediata (webhook) | Baixo — **preferencial** |
| Cartão | Imediata se autorizada | Baixo |
| Boleto | Após compensação (1–3 dias úteis) | Alto — avisar no UI |

**Obrigações técnicas (alinhado a `payments-idempotency`):**

- Webhook com verificação de assinatura no body bruto.
- `provider_event_id` único; processamento idempotente.
- Chave de idempotência na criação da cobrança (tenant + plano + tentativa).
- Nunca liberar créditos duas vezes para o mesmo pagamento.
- Não alterar preços/gateway sem aprovação explícita.

**Gateway sugerido (já citado no plano WhatsApp):** Asaas. Confirmar antes de implementar.

---

## 6. Escopo funcional por superfície

### 6.1 Cardápio público (cliente)

- Landing do estabelecimento (`/[slug]/menu` ou `https://{subdominio}`)
- Categorias, itens, fotos, preços, opcionais/adicionais
- Carrinho + tipo: delivery / retirada
- Checkout → cria pedido + notifica loja (e/ou WhatsApp)
- Status do pedido (polling ou Socket.IO room do pedido)

### 6.2 Painel lojista — Cardápio

- CRUD categorias e itens (com upload de imagem)
- Disponibilidade (pausar item / “esgotado”)
- Horários de funcionamento
- Taxa de entrega / raio / retirada
- Config WhatsApp / logo / nome da loja (já existe esboço em `venda_config`)

### 6.3 Painel lojista — Pedidos (Kanban)

Status sugeridos:

`recebido → aceito → preparando → sai_entrega|pronto_retirada → entregue → cancelado`

- Filtros, som/alerta de novo pedido
- Impressão de pedido (cozinha)
- Bloqueio de aceite se tenant `esgotado`/`bloqueado`

### 6.4 Módulo Gestor (billing do lojista)

Telas:

1. **Meu plano** — nome, preço, saldo, dias restantes, barra de consumo  
2. **Trocar plano** — cards Iniciante / Essencial / Premium (UI referência verde)  
3. **Recarregar** — PIX/cartão/boleto + aviso de boleto  
4. **Histórico** — ciclos, pagamentos, liberações em confiança  
5. **Alertas** — saldo baixo / ciclo a vencer  

### 6.5 Admin SaaS

- Catálogo de planos (preço, limite, features flags)
- Ativar módulo `cardapio` no tenant
- Liberação em confiança
- Visão de inadimplência / ciclos
- Métricas agregadas (não cross-ler dados de cardápio sem `withTenantSchema`)

### 6.6 Bot WhatsApp / Relatórios / Fidelidade / Pixel

Ver fases na seção 10. Detalhe do robô: complementar `docs/plano-robo-whatsapp.md` (não duplicar aqui).

---

## 7. Gap analysis vs plataforma atual

| Já existe | Situação | Ação |
|-----------|----------|------|
| `Plano` (public) | Preço mensal + lista de módulos; **sem** limite de pedidos / ciclo pré-pago | Estender modelo **ou** criar `cardapio_planos` + `cardapio_ciclos` |
| `Tenant.planoId` / `planoAte` / trial | Assinatura genérica | Separar billing do módulo cardápio do plano global SaaS **ou** unificar com cuidado |
| `venda_produtos` / `venda_pedidos` / `venda_config` | DDL no provisioner | Base do cardápio; evoluir status, endereço, pagamento do **cliente final**, débitos de crédito |
| Módulo `vendas` no código | Docs citam; pasta `modules/vendas` não está no tree atual | Recriar/reativar módulo `cardapio` (ou `vendas`) no padrão Fastify |
| CRM pagamentos admin | Lançamentos manuais | Não substitui cobrança online do Gestor |
| Plano TV por tenant | Precedente de “limite por ciclo/uso” | Usar como **padrão de UX** (barra de uso), não misturar domínio |
| `docs/plano-robo-whatsapp.md` | Integração Meta/n8n/Asaas | Fase Bot + PIX do **cliente final** |

### Lacunas a completar (este PRD fecha)

1. Modelo pré-pago com créditos e ciclo 30 dias  
2. Módulo Gestor (UI + API)  
3. Liberação em confiança auditável  
4. Débito de crédito atômico por pedido  
5. Planos comerciais Iniciante/Essencial/Premium  
6. Subdomínio por tenant  
7. Roadmap de fidelidade, pixel, relatórios, treinamento  

---

## 8. Modelo de dados proposto

### 8.1 Schema `public` (global)

```text
cardapio_planos
  id, codigo (iniciante|essencial|premium), nome, preco_centavos,
  limite_pedidos (NULL = ilimitado), ciclo_dias DEFAULT 30,
  features jsonb, ativo, created_at

cardapio_assinaturas          -- 1 por tenant (estado atual)
  id, tenant_id UNIQUE, plano_id, status,
  ciclo_atual_id NULLABLE,
  confianca_ate TIMESTAMPTZ NULLABLE,
  confianca_pedidos_extra INT DEFAULT 0,
  updated_at

cardapio_ciclos
  id, tenant_id, plano_id, inicio, fim,
  limite_pedidos NULLABLE, consumidos INT DEFAULT 0,
  origem (compra|upgrade|confianca|admin),
  pagamento_id NULLABLE, status (ativo|encerrado|expirado)

cardapio_pagamentos
  id, tenant_id, plano_id, valor_centavos, meio (pix|cartao|boleto),
  status (pendente|pago|falhou|expirado|estornado),
  provider, provider_charge_id, provider_event_id UNIQUE,
  idempotency_key UNIQUE, paid_at, created_at

cardapio_confianca_logs
  id, tenant_id, admin_user_id, motivo, valida_ate,
  pedidos_extra, created_at
```

### 8.2 Schema `tenant_*` (evolução)

```text
venda_produtos     -- já existe; + tempo_preparo, disponivel, adicionais jsonb
venda_categorias   -- NOVA (substituir string solta quando possível)
venda_pedidos      -- evoluir status + campos:
  tipo (delivery|retirada), endereco_json, taxa_entrega,
  forma_pagamento_cliente, status_pagamento_cliente,
  credito_debitado BOOLEAN, ciclo_id UUID NULLABLE
venda_config       -- + subdomain, pixel_meta, pixel_google, fidelidade_ativo
venda_fidelidade_* -- fase P2
```

**Débito atômico (regra):**

```sql
-- Em transação no public (assinatura/ciclo) + pedido no tenant:
UPDATE cardapio_ciclos
SET consumidos = consumidos + 1
WHERE id = :ciclo AND (limite_pedidos IS NULL OR consumidos < limite_pedidos)
RETURNING *;
-- Se 0 rows → rejeitar pedido (402/403 de negócio)
```

---

## 9. APIs (esboço)

Prefixo sugerido: `/api/cardapio` (JWT + `withTenantSchema` onde couber).

| Método | Rota | Auth | Função |
|--------|------|------|--------|
| GET | `/public/:slug/menu` | pública | Cardápio ativo |
| POST | `/public/:slug/orders` | pública + rate limit | Criar pedido |
| GET | `/gestor/subscription` | lojista | Plano, saldo, ciclo |
| POST | `/gestor/checkout` | lojista | Iniciar recarga/troca |
| POST | `/gestor/webhooks/:provider` | assinatura gateway | Confirmar pagamento |
| POST | `/admin/cardapio/trust-release` | admin | Liberação em confiança |
| GET/PATCH | `/orders`, `/orders/:id` | lojista | Gestão de pedidos |
| CRUD | `/products`, `/categories` | lojista | Cardápio |

Respostas de erro de negócio tipadas (ex.: `CARDAPIO_CREDITS_EXHAUSTED`, `CARDAPIO_CYCLE_EXPIRED`).

---

## 10. Fases de implementação

### Fase 0 — Spec & decisões (agora)
- [x] Capturar referência Pop Pedidos + regras pré-pago
- [ ] Aprovar nome comercial, preços finais, gateway, regra de débito/estorno
- [ ] Aprovar upgrade pró-rata vs ciclo novo

### Fase 1 — MVP operacional (P0)
- Cardápio público + CRUD lojista (em cima de `venda_*`)
- Kanban de pedidos com status mínimos
- Ciclos/créditos + bloqueio ao esgotar/expirar
- Gestor: ver saldo, recarregar via **PIX** (primeiro meio)
- Admin: plano + liberação em confiança

### Fase 2 — Canais e pagamentos (P1)
- Cartão + boleto no Gestor
- Bot WhatsApp (ligar a `plano-robo-whatsapp.md`)
- Subdomínio por tenant
- Relatórios exportáveis (CSV/PDF)
- Alertas de saldo baixo / ciclo a vencer

### Fase 3 — Crescimento (P2)
- Fidelidade
- Pixel Meta/Google
- Treinamento (CMS/links)
- App/PWA cliente (opcional)

---

## 11. UX / design (referência)

- Paleta de marketing da referência: fundo claro + **verde** de CTA (#00A800 approx).
- No painel interno do SaaS: **seguir design system existente** (Tailwind + shadcn), não forçar o verde da landing concorrente em todo o app.
- Landing/pricing do módulo pode ter identidade própria (definir marca).
- Cards de plano: nome, preço, limite, checklist de features, CTA “Quero esse”.

---

## 12. Segurança e multi-tenancy

- Toda query de cardápio/pedido do lojista via `withTenantSchema`.
- Cardápio público: resolver tenant por `slug`/`subdomain` sem vazar outros tenants.
- Rate limit forte em criação pública de pedidos e webhooks.
- Uploads: MIME, tamanho, sem path traversal.
- Webhooks: assinatura + idempotência.
- Não logar CPF/telefone completo / PIX copia-cola em claro além do necessário.
- RBAC: operador não acessa Gestor financeiro.

---

## 13. Critérios de aceite (MVP)

1. Lojista com ciclo ativo e saldo > 0 cria itens e recebe pedido pelo link público.  
2. Cada pedido `recebido` incrementa `consumidos` exatamente 1 vez.  
3. Com saldo 0 ou ciclo expirado, API recusa novo pedido com erro tipado; UI do Gestor oferece recarga.  
4. Pagamento PIX confirmado cria ciclo novo de 30 dias e zera consumo.  
5. Admin aplica liberação em confiança; loja volta a aceitar pedidos até `confianca_ate`.  
6. Isolamento: tenant A nunca lê pedidos/produtos do tenant B.  

---

## 14. Decisões abertas (precisam do Emmanuel)

1. **Nome da marca** do produto (não usar “Pop Pedidos” em produção).  
2. Preços/limites finais dos 3 planos.  
3. Gateway de pagamento (Asaas vs outro).  
4. Débito no `recebido` vs no `aceito` pelo lojista; política de estorno.  
5. Upgrade: pró-rata ou ciclo novo imediato.  
6. Auto-confiança pelo lojista (sim/não) ou só admin.  
7. Unificar com `Plano` global do SaaS ou billing **só** do módulo cardápio.  

---

## 15. Próximo passo

Quando as decisões da seção 14 estiverem ok (mesmo que parciais), implementar **Fase 1** no padrão do repositório:

`modules/cardapio/` (controller / service / schema / routes / test) + telas em `apps/frontend` + migrations/DDL no provisioner + entrada no changelog do `CLAUDE.md`.

Enquanto isso, continue enviando materiais (mais prints do Gestor, fluxos de pedido, regras de taxa de entrega, etc.) — este PRD será atualizado incrementalmente.
