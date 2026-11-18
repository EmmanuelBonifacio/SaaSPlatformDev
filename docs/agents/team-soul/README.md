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
| 7 | Content Agent | `content` | Growth Lead | draft — `agents/content.md` |

## Org chart (provisório)

```
[Growth Lead — TBD]
 ├── SEO Master (seo_master)
 │    ├── Sitemap (sitemap)
 │    ├── Robots (robots)
 │    └── Search Console (search_console)
 ├── Analytics (analytics)
 ├── Marketing / Paid (marketing_paid)
 └── Content (content)   # produz; SEO review; publish com approval
```

## Gaps de plataforma já identificados

- Sitemap / robots por tenant · connectors GSC, GA4, Ads · CMS/content API
- Artifacts: `seo_health_report`, `analytics_decision_brief`, `marketing_performance_report`, `content_draft`
- Brand voice por tenant · hard budget de mídia

## Próximos prompts esperados

- Schema / Meta tags / Local / AEO / Growth Lead / Creative
- Confirmar se Content reporta a Growth ou a SEO Master
