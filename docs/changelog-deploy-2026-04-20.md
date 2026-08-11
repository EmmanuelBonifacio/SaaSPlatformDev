# Changelog — Deploy 20/04/2026

## Financeiro — Novas funcionalidades

- Dashboard financeiro previsto x realizado.
- Campos `supplier` e `cost_center` em transações e compromissos.
- Importação de extrato CSV no financeiro.
- Classificação opcional por IA (Ollama) durante importação CSV.
- Histórico mensal persistido em `financial_monthly_history`.
- Endpoints de histórico e relatório mensal (JSON/CSV).

### Rotas novas do financeiro

- `GET /financeiro/dashboard`
- `POST /financeiro/importacoes/extrato-csv`
- `POST /financeiro/historico/snapshot`
- `GET /financeiro/historico`
- `GET /financeiro/relatorios/mensal`

### Banco de dados (tenant)

- Tabela nova: `financial_commitments`
- Tabela nova: `financial_occurrences`
- Tabela nova: `financial_payments`
- Tabela nova: `financial_monthly_history`
- Coluna nova em `transactions`: `supplier`
- Coluna nova em `transactions`: `cost_center`

---

## Vendas/WhatsApp — Correções

- Removido caractere especial que aparecia como `?` no WhatsApp.
- Mensagens de pedido agora incluem link de foto quando disponível.
- Ajustado gerador de link em `apps/frontend/src/modules/vendas/lib/whatsapp.ts`.

### Variáveis de ambiente recomendadas

- `NEXT_PUBLIC_WHATSAPP_MEDIA_BASE_URL=https://api.seudominio.com`
- `IA_PROVIDER=ollama` (opcional)
- `OLLAMA_BASE_URL=http://localhost:11434` (ou servidor Ollama)
- `OLLAMA_MODEL=llama3.1:8b` (ou modelo configurado)

---

## Observações de deploy

- Reiniciar backend após subir alterações para registrar rotas novas.
- Garantir que frontend aponta para backend correto (`NEXT_PUBLIC_API_URL`).
- Para preview de imagem no WhatsApp, usar URL pública (não localhost).

---

## Status final (20/04/2026)

- Commit enviado para `main` com os ajustes funcionais de financeiro, vendas e estabilidade do frontend.
- Commit adicional de segurança enviado para `main` com `npm audit fix` (sem breaking change) no backend e frontend.
- Build validado com sucesso:
  - `apps/backend`: `npm run build`
  - `apps/frontend`: `npm run build`

### Pendências de segurança (ainda abertas, exigem upgrade breaking)

- Backend:
  - `@fastify/jwt`/`fast-jwt` (crítica) requer upgrade major para `@fastify/jwt@10`.
  - `node-ssdp`/`ip` (alta) requer upgrade major.
- Frontend:
  - `next` (alta) requer upgrade major para v16+.

> Recomendação: executar esses upgrades em branch separada com bateria de testes antes de publicar em produção.
