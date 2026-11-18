# Equipe de Agentes — Alma & Funções (design)

Documento vivo do projeto de “alma” da equipe de IA no módulo `/agents`.

**Status:** design only — sem seed/runtime até autorização explícita.

## Como usamos este folder

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Índice da equipe, hierarquia, gaps de plataforma |
| `00-blueprint.md` | Como prompts viram Agent + Skills + Tools no sistema |
| `agents/*.md` | Alma de cada agente (prompt original + análise + complementos) |
| `skills/*.md` | Skills reutilizáveis (quando surgirem) |

## Equipe (em montagem)

| # | Agente | Role sugerido | Reporta para | Status |
|---|--------|---------------|--------------|--------|
| 1 | SEO Master Agent | `seo_master` | Growth Lead (TBD) | draft — `agents/seo-master.md` |
| 2 | Sitemap Agent | `sitemap` | `seo_master` | draft — `agents/sitemap.md` |
| 3 | Robots Agent | `robots` | `seo_master` | draft — `agents/robots.md` |
| 4 | Search Console Agent | `search_console` | `seo_master` | draft — `agents/search-console.md` |
| 5 | Analytics Agent | `analytics` | Growth Lead | draft — `agents/analytics.md` |
| 6 | Marketing Agent (Paid) | `marketing_paid` | Growth Lead | draft — `agents/marketing.md` |

## Org chart (provisório)

```
[Growth Lead — TBD]
 ├── SEO Master (seo_master)
 │    ├── Sitemap (sitemap)
 │    ├── Robots (robots)
 │    └── Search Console (search_console)
 ├── Analytics (analytics)         # site + canais; pixel truth
 └── Marketing / Paid (marketing_paid)  # Meta / Google / TikTok
```

## Gaps de plataforma já identificados

- Gerador de sitemap por tenant · `robots.txt` por host
- Connectors: GSC, Analytics (GA4), **Meta/Google/TikTok Ads**
- Artifacts: `seo_health_report`, `analytics_decision_brief`, `marketing_performance_report`
- Hard budget de mídia paga (além de tokens LLM)

## Próximos prompts esperados

- Schema / Meta tags / Conteúdo / Local / AEO / Growth Lead / Creative
- Confirmar se “Marketing” permanece ou vira “Paid Media”
