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
| 0 | Audit Agent | `audit` | Growth Lead (inspetor) | draft — `agents/audit.md` |
| 1 | SEO Master Agent | `seo_master` | Growth Lead | draft — `agents/seo-master.md` |
| 2 | Sitemap Agent | `sitemap` | `seo_master` | draft — `agents/sitemap.md` |
| 3 | Robots Agent | `robots` | `seo_master` | draft — `agents/robots.md` |
| 4 | Search Console Agent | `search_console` | `seo_master` | draft — `agents/search-console.md` |
| 5 | Analytics Agent | `analytics` | Growth Lead | draft — `agents/analytics.md` |
| 6 | Marketing Agent (Paid) | `marketing_paid` | Growth Lead | draft — `agents/marketing.md` |
| 7 | Content Agent | `content` | Growth Lead | draft — `agents/content.md` |

## Org chart (provisório)

```
[Growth Lead — TBD]
 ├── Audit (audit)              ★ inspetor geral / scorecard 0–100
 ├── SEO Master (seo_master)
 │    ├── Sitemap (sitemap)
 │    ├── Robots (robots)
 │    └── Search Console (search_console)
 ├── Analytics (analytics)
 ├── Marketing / Paid (marketing_paid)
 └── Content (content)
```

## Scores (Audit)

| Score | Escala | Fonte principal |
|-------|--------|-----------------|
| SEO Score | 0–100 | SEO Master + Sitemap + Robots + GSC |
| Marketing Score | 0–100 | Marketing Paid (+ pixels via Analytics) |
| Growth Score | 0–100 | Composto (fórmula na skill `growth-score-formula`) |

## Gaps de plataforma já identificados

- Connectors: GSC, GA4, Ads, CMS · sitemap/robots por tenant
- Artifacts tipados + **`digital_health_scorecard`** (histórico)
- Rubrica de score versionada · Audit criar tasks para outros roles
- Brand voice · hard budget de mídia

## Próximos prompts esperados

- Growth Lead / Schema / Meta / Local / AEO / Creative
- Fechar pesos da rubrica e fórmula do Growth Score
