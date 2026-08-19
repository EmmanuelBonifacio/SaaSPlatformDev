# Módulo FinIA — Assistente Financeiro Pessoal com IA

O **FinIA** é um módulo de inteligência financeira pessoal integrado ao **SaaSPlatformDev Core**. Ele permite o gerenciamento completo de despesas, contas fixas, dívidas e leitura de extratos bancários em PDF através do **WhatsApp** (Evolution API) e do **Painel Web (Next.js/React)**, utilizando o **Anthropic Claude 3.5 Sonnet com Tool Calling**.

---

## 🎯 Funcionalidades Principais

1. **Atendimento via WhatsApp (Evolution API + Claude 3.5 Sonnet):**
   - Entendimento de mensagens em linguagem natural (ex: *"gastei 45 reais no mercado"*).
   - Execução automática de ferramentas (*Tool Calling*) no banco PostgreSQL do tenant.
   - Categorização automática: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Outros.
   - Respostas em R$ formatadas em Português-BR.
2. **Leitura e Processamento de Extratos PDF:**
   - Upload de extratos bancários em PDF via Web ou WhatsApp.
   - Leitura inteligente via **Claude Vision**, extraindo data, descrição, tipo e valor para lançamento automático.
3. **Dashboard Web Interativo (Next.js / Recharts):**
   - Saldo do mês, Entradas (Receitas) e Saídas (Despesas).
   - Gráfico de pizza por categoria.
   - Controle de Contas Fixas recorrentes e Dívidas/Parcelamentos.
   - Pareamento de WhatsApp via QR Code.

---

## 🛠️ Como Instalar e Configurar

### 1. Variáveis de Ambiente (`apps/backend/.env`)
Adicione a chave da Anthropic (opcional, possui fallback inteligente caso não informada):
```env
ANTHROPIC_API_KEY=sua_chave_sk_ant_...
EVOLUTION_API_HOST=http://localhost:8080
EVOLUTION_API_KEY=saas_evolution_secret
```

### 2. Rodar o Docker Compose (Postgres + Evolution API)
```bash
docker compose up postgres pgadmin evolution-api -d
```

### 3. Rodar o Backend e Frontend
```bash
# Terminal 1 — Backend API
cd apps/backend
npm run dev

# Terminal 2 — Frontend Painel Web
cd apps/frontend
npm run dev
```

---

## 🧪 Como Testar os 3 Comandos Solicitados

### Teste 1: Lançar um Gasto em Linguagem Natural
Envie via WhatsApp ou via API `POST /finia/webhook/whatsapp`:
```json
{
  "event": "messages.upsert",
  "instance": "tenant_default",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false },
    "message": { "conversation": "gastei 45 reais no mercado" }
  }
}
```
**Resultado Esperado:** O FinIA chama a ferramenta `criar_transacao`, lança R$ 45,00 na categoria **Alimentação** e responde confirmando o valor em R$.

---

### Teste 2: Criar uma Conta Fixa Recorrente
Envie a mensagem:
```json
{
  "event": "messages.upsert",
  "instance": "tenant_default",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false },
    "message": { "conversation": "criar conta fixa de internet 99 todo dia 10" }
  }
}
```
**Resultado Esperado:** O FinIA chama a ferramenta `criar_conta_fixa`, cadastra a conta "internet" de R$ 99,00 com vencimento todo dia 10.

---

### Teste 3: Upload e Leitura de Extrato Bancário em PDF
1. Abra o Painel Web em `http://localhost:3001/<slug-do-tenant>/finia`.
2. Clique no botão **"Upload PDF Extrato"**.
3. Selecione um arquivo `.pdf` de extrato.
4. O Claude Vision irá extrair as movimentações, registrar no banco e atualizar o saldo e o gráfico de categorias em tempo real!
