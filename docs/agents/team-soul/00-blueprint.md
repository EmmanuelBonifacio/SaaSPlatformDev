# Blueprint — do prompt de alma → implementação

## Primitivos do sistema (já existem)

| Primítivo | Campo / API | Uso para “alma” |
|-----------|-------------|-----------------|
| Identidade | `name`, `role`, `title`, `capabilities` | Quem é o agente |
| Alma / SO | `instructions` (máx. 20k) | Missão, processo, formato de saída, limites |
| Runtime | `adapterType` + `harness` | Claude / Codex / Cursor / webhook |
| Ferramentas | `agent_tools` (`web_search`, `http_fetch`, …) | Capacidade operacional |
| Skills | `/agents/skills` + versions + attach | Playbooks versionados (fora do prompt monólito) |
| Hierarquia | `reportsToAgentId` | Org chart |
| Governança | `requireRunApproval`, budgets, secret refs | Fail-closed e custo |
| Trabalho | tasks / projects / goals / routines | Demandas e cadência |

## Padrão recomendado por agente

1. **`instructions`** = alma estável (missão, ética, processo, formato de saída, o que NUNCA fazer).
2. **Skills** = procedimentos mutáveis (checklists SEO, templates de meta, schema recipes).
3. **Tools** = só o necessário para executar (ex.: SEO → `http_fetch` + `web_search`).
4. **Approvals** = ligado se o agente puder “corrigir” (alterar site/produção).
5. **Budget** soft/hard por período — SEO técnico com fetch em massa custa.

## Separação alma vs. skill

- Alma muda pouco; skill versiona (Skill Studio).
- Evitar colocar catálogo enorme de Schema.org dentro de `instructions` — virar skill `seo-schema-recipes`.
- Processo de raciocínio (checklist 1–8) pode ficar na alma OU skill `seo-audit-pipeline`.

## Gaps a considerar depois (não implementar agora)

- Tools SEO-específicas (GSC, Bing Webmaster, PageSpeed) — hoje só genéricas.
- Conectores OAuth: GSC, GA4/equivalente, Meta Ads, Google Ads, TikTok Ads (fluxo OAuth de connectors já existe; faltam kinds).
- Artifacts: SEO audit / `seo_health_report` / `analytics_decision_brief` / `marketing_performance_report`.
- Rotinas: re-auditoria SEO, health GSC, anomaly analytics, paid waste diário.
- Binding tenant ↔ property GSC / analytics stream / ad accounts (isolamento multi-tenant).
- Org sob Growth Lead: SEO Master (com subordinados) ∥ Analytics ∥ Marketing Paid.
- Mutações de mídia paga: approval + hard budget de spend (não só tokens LLM).
