---
name: repo-structure
description: Padronizar pastas, limpeza de órfãos e alinhamento docs↔código no monorepo sem relaxar segurança.
---

# Estrutura e higiene do monorepo

## Precedência (obrigatória)

Esta skill **não** sobrescreve segurança, privacidade, autorização nem regras always-on.

1. Segurança / privacidade / autorização
2. `.agents/rules/` always-on (`governance`, `security`, `architecture`, `data-integrity`, `testing`)
3. `CLAUDE.md` e `rules/`
4. Skills especializadas (`access-control-tenancy`, `antigravity-security`, `safe-refactor`, etc.)
5. **Esta skill** (`repo-structure`)
6. Preferências da tarefa (Project / usuário), se compatíveis com 1–5

Se um pedido de “limpar/organizar” conflitar com tenancy, auth, secrets, migrations de produção ou controles TLS, **pare** e escale conforme `governance.md`.

## Quando usar

- Inventariar divergência docs ↔ código
- Apagar órfãos, docs mortos ou duplicatas sem comportamento
- Mover/renomear pastas para a árvore alvo do monorepo
- Atualizar índices (README, CLAUDE, `.agents/README`) após reorganização
- Criar ou revisar a taxonomia de `docs/`, `scripts/`, `docker/`, `apps/`

Não use esta skill para: feature nova, correção de regra de negócio, migration de dados, deploy ou rotação de segredos (use as skills próprias).

## Árvore canônica (resumo)

- `apps/backend`, `apps/frontend` (+ laravel-* somente se ainda forem produto)
- `docker/` só serviços com config versionada realmente usada
- `scripts/` toda automação ops (incluindo deploy)
- `docs/architecture|modules|ops|archive`
- `.agents/rules` + `.agents/skills`
- Sem `apps/mobile` ou módulos de produto até existirem no código

Fonte de verdade de módulos ativos: registro em `server.ts` + `modules.seed.ts` + rotas frontend existentes — **não** seções históricas do CLAUDE.

## Procedimento

1. Leia governance + antigravity-security + safe-refactor; confirme que o pedido é análise/execução autorizada.
2. Inventarie o caminho alvo (`rg`, árvore, imports, compose, seeds). Classifique A (órfão seguro), B (ambíguo), C (mover).
3. Para execução: só itens explicitamente aprovados. Um PR temático por vez.
4. Antes de apagar: zero imports/runtime; docs how-to de módulo inexistente ok; **não** apague `prisma/migrations/**` aplicadas.
5. Antes de mover: atualize referências no mesmo PR; rode testes/build do app afetado.
6. Após mudança estrutural: atualize README/CLAUDE/.agents índices e changelog §10 do CLAUDE.
7. Não misture limpeza com feature nem com “correção oportunista” de regra de negócio.

## Proibido

- Recriar módulos documentados mas ausentes “para bater com o CLAUDE”
- Commitar `node_modules/`, `vendor/` (salvo decisão explícita documentada), `.env`, dumps, secrets
- Dropar tabelas/schemas de tenant ou public sem plano aprovado
- Desabilitar lint/testes/TLS/auth para facilitar limpeza
- Tratar preferência de organização como licença para enfraquecer isolamento multi-tenant

## Entrega

Liste arquivos removidos/movidos, PRs, comandos de verificação e itens B ainda pendentes de decisão.
