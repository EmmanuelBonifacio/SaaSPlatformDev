---
name: access-control-tenancy
description: Implementar ou revisar autenticação, autorização, acesso a objetos e isolamento de dados entre tenants.
---

# Autorização e isolamento multi-tenant

## Procedimento

1. Identifique o ator autenticado, papel, permissões, tenant confiável, objeto solicitado e operação.
2. Confirme como o projeto obtém a identidade e aplica autenticação/autorização nas rotas e services existentes.
3. Derive tenant do contexto autenticado verificado; não confie no slug, UUID, papel, owner ou tenant enviado pelo cliente.
4. Revalide a relação entre ator, tenant e objeto no servidor em cada leitura e mutação. Middleware não substitui autorização por recurso.
5. Para dados tenant, use exclusivamente `withTenantSchema()` conforme `CLAUDE.md`; use client global apenas para tabelas públicas documentadas.
6. Evite respostas que revelem existência de recursos de outros tenants. Minimize campos retornados e filtre segredos/dados pessoais.
7. Teste usuário não autenticado, papel insuficiente, recurso inexistente, recurso de outro usuário/tenant, leitura e escrita cruzadas, e tenant inválido usando banco isolado.
8. Se houver RLS, avalie policies e teste com papéis reais no banco de teste. Não presuma que RLS existe nem que `auth.uid()` se aplica a este backend.

Mudanças em autorização, claims, schema, constraints ou migrations exigem plano e aprovação prévios. Nunca desabilite uma proteção para contornar falha de teste.
