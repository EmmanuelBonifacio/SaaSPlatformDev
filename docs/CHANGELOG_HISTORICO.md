# Changelog Histórico

Este arquivo recebe as entradas do `CLAUDE.md` (Seção 10) após cada deploy confirmado em produção.

**Formato de cada entrada:**
```
DATA | TIPO | DESCRIÇÃO | ARQUIVOS AFETADOS | AUTOR
```

**Tipos:** `feat` | `fix` | `security` | `refactor` | `breaking`

---

## 2026-11-14

| Data | Tipo | Descrição | Arquivos afetados |
|------|------|-----------|-------------------|
| 2026-11-14 | chore | Arquivados/removidos changelogs e notas de abril/2026 sobre módulos ausentes no checkout (`changelog-deploy-2026-04-20.md`, `notas-deploy-abril-2026.md`) na limpeza Lista A | `docs/` |

## 2026-05-20

| Data | Tipo | Descrição | Arquivos afetados |
|------|------|-----------|-------------------|
| 2026-05-20 | fix | `auth.service.ts` lia `JWT_ACCESS_TOKEN_EXPIRATION` (inexistente) — tokens sempre expiravam em 1h | `apps/backend/src/modules/auth/auth.service.ts` |
| 2026-05-20 | fix | `auth.service.ts` lia `JWT_REFRESH_TOKEN_EXPIRATION` (inexistente) — refresh expiration ignorada | `apps/backend/src/modules/auth/auth.service.ts` |
| 2026-05-20 | fix | `BCRYPT_SALT_ROUNDS` hardcoded ignorava `BCRYPT_ROUNDS` do `.env` | `apps/backend/src/modules/auth/auth.service.ts` |
| 2026-05-20 | refactor | Bloco de 130 linhas de `console.log` no startup substituído por `app.log.info()` estruturado | `apps/backend/src/server.ts` |
| 2026-05-20 | refactor | Limpeza de diretórios legados da raiz do repositório | `meuSistemaCompleto/`, `meuSistemaFrontend/`, `SaasPlatform/`, `projetoRobo/`, `alteracaodeploy/`, `Treinos de Programação/` |
| 2026-05-20 | feat | Criação do `README.md` profissional na raiz do projeto | `README.md` |
| 2026-05-20 | feat | Criação do `CLAUDE.md` com regras, checklist de segurança e workflow de deploy | `CLAUDE.md` |
| 2026-05-20 | feat | Criação de `docs/` com plano do robô WhatsApp e changelog de deploy | `docs/` |
