---
name: project-architecture
description: Restrições arquiteturais obrigatórias do SaaSPlatformDev para mudanças de código e dados.
always_on: true
---

# Arquitetura e limites do projeto

- Use `CLAUDE.md` como fonte primária para arquitetura detalhada e convenções. Consulte `rules/` para regras específicas de CORS e tenants.
- Backend: Fastify, TypeScript, Prisma e PostgreSQL. Frontend web: Next.js, React, Axios e TanStack Query. Não adicione framework ou dependência sem justificativa e aprovação.
- Toda query de dados de tenant deve ocorrer por `withTenantSchema(tenantId, ...)` em `apps/backend/src/core/database/prisma.ts`. Dados globais do schema `public` seguem o client global conforme a arquitetura existente.
- Nunca confie em `tenantId`, papel, preço, saldo, status de pagamento ou permissão enviados pelo browser. Derive identidade e tenant de contexto autenticado validado e revalide autorização no servidor.
- Separe HTTP/controller, regra de negócio/service e validação/schema conforme o padrão do módulo existente. Frontend é apresentação e experiência; não é autoridade de segurança ou financeira.
- Use a instância Axios documentada para chamadas do frontend e preserve as convenções existentes de estado servidor/UI. Antes de contrariar uma regra atual, confirme se ela ainda representa o comportamento válido do projeto.
- Migrations Prisma são destinadas ao schema público segundo a documentação atual. Não presuma que elas provisionam ou atualizam os schemas de tenant; identifique o mecanismo real e proponha plano antes de alterar.
- Não presuma Supabase, RLS, filas, Redis, Vault ou outros componentes não confirmados no repositório. Se necessários, demonstre a lacuna, alternativas existentes, custo operacional e risco; aguarde aprovação para adicionar infraestrutura.
- Para bibliotecas externas, consulte a documentação da versão instalada através do fluxo Context7 descrito em `CLAUDE.md`, quando disponível.

## Instruções inconsistentes ou legadas

Uma regra antiga não torna segura uma implementação insegura. Em particular, não use `rejectUnauthorized: false` nem desative validação de certificado como solução geral. Se uma instrução existente recomendar isso, explique o conflito e proponha uma correção que mantenha a validação TLS; não a propague para código novo.

Deploy, migrações e operações de servidor devem identificar explicitamente o ambiente. O repositório contém documentação de deploy Docker e um `deploy.sh` com PM2/Hostinger; não misture os fluxos nem execute scripts até confirmar o alvo e inspecionar seu conteúdo.
