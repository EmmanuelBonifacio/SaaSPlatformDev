# Migrations 0466 / 0467 — divergência CRLF vs LF

**Não altere o conteúdo SQL das migrations para forçar testes a passar.**

## Achado (upstream `paperclipai/paperclip` master, clone shallow)

Arquivos analisados:

- `packages/db/src/migrations/0466_drop_project_environment.sql`
- `packages/db/src/migrations/0467_fair_human_torch.sql`

No upstream público ambos estão em **LF** (`\n` apenas).

Drizzle grava o hash como `sha256` do **conteúdo bruto do arquivo**
(`createHash("sha256").update(content)`). Checkout Windows com `core.autocrlf=true`
converte LF→CRLF e **muda o hash**, fazendo testes de histórico/migração falharem
(~13 casos tipicamente) mesmo com SQL semanticamente idêntico.

### Hashes observados (upstream LF vs CRLF simulado)

| Arquivo | LF (canônico) | CRLF (simulado) |
|---------|---------------|-----------------|
| `0466_drop_project_environment.sql` | `07ca1c666c6471fdb9ce7a0a5fb31bf1a074138466fa8daae50b53199b8e0d7c` | `564115db9d44ca1d6bf32d63b9615b87a6a4c445601cdc6a11d6444ba39c4401` |
| `0467_fair_human_torch.sql` | `50ce0eb2567570b098bea1de92fe6a220d139e4ba83438195fbbad1be51e31a1` | `220e48dc3b9c86c9ad930e12ce81bfa8063ebc56a918c71224c4b1334d7b17d7` |

## O que fazer no fork `EmmanuelBonifacio/paperclip`

1. Garantir `.gitattributes` com `*.sql text eol=lf` (ou equivalente) nas migrations.
2. No Windows, antes dos testes: `git config core.autocrlf false` no repo e
   re-checkout dos `.sql` se necessário.
3. Rodar `pnpm test:setup` (script abaixo) para resetar o Postgres embutido /
   banco de teste — **sem** reescrever hashes no journal nem editar migrations.
4. Se o histórico local já aplicou hashes CRLF, reset do DB de teste é a correção;
   não “corrigir” o SQL.

## Script

Ver [`scripts/test-setup.mjs`](./scripts/test-setup.mjs).
