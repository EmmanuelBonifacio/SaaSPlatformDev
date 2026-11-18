# Equipe de Agentes — Alma & Funções (design)

Documento vivo do projeto de “alma” da equipe de IA no módulo `/agents`.

**Status:** design only — sem seed/runtime até autorização explícita.  
**Topo da org:** Growth Director (`growth_director`) — orquestra; não executa domínio.

## Como usamos este folder

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Índice da equipe, hierarquia, gaps de plataforma |
| `00-blueprint.md` | Como prompts viram Agent + Skills + Tools no sistema |
| `agents/*.md` | Alma de cada agente (prompt original + análise + complementos) |
| `skills/*.md` | Skills reutilizáveis (quando surgirem) |

## Equipe (montagem atual)

| # | Agente | Role | Reporta para | Status |
|---|--------|------|--------------|--------|
| — | **Growth Director** | `growth_director` | humano / owner | draft — `agents/growth-director.md` |
| 0 | Audit Agent | `audit` | Growth Director | draft — `agents/audit.md` |
| 0b | Report Agent | `report` | Growth Director | draft — `agents/report.md` |
| 1 | SEO Master Agent | `seo_master` | Growth Director | draft — `agents/seo-master.md` |
| 2 | Sitemap Agent | `sitemap` | `seo_master` | draft — `agents/sitemap.md` |
| 3 | Robots Agent | `robots` | `seo_master` | draft — `agents/robots.md` |
| 4 | Search Console Agent | `search_console` | `seo_master` | draft — `agents/search-console.md` |
| 5 | Analytics Agent | `analytics` | Growth Director | draft — `agents/analytics.md` |
| 6 | Marketing Agent (Paid) | `marketing_paid` | Growth Director | draft — `agents/marketing.md` |
| 7 | Content Agent | `content` | Growth Director | draft — `agents/content.md` |

## Org chart

```
Growth Director (growth_director)     ★ orquestra; min agentes; Impacto→ROI→Escala→Automação
 ├── Audit (audit)                     scorecard
 ├── Report (report)                   narrativa stakeholders
 ├── SEO Master (seo_master)
 │    ├── Sitemap (sitemap)
 │    ├── Robots (robots)
 │    └── Search Console (search_console)
 ├── Analytics (analytics)
 ├── Marketing / Paid (marketing_paid)
 └── Content (content)
```

## Camadas

| Camada | Agentes | Função |
|--------|---------|--------|
| Direção | Growth Director | Triage, roteamento, plano, consolidação |
| Governança | Audit, Report | Pontuar / comunicar |
| Especialistas | SEO cluster, Analytics, Paid, Content | Executar domínio |

## Gaps de plataforma

- Orquestração multi-agent (DAG de runs/tasks) — crítico p/ dispatch do Director
- Connectors GSC/GA4/Ads/CMS · sitemap/robots
- Artifacts: scorecard, stakeholder_report, **`growth_execution_plan`**
- Rubrica Audit · budget agregado por plano

## Próximos (opcional)

- Schema / Meta / Local / AEO / Creative
- Fechar rubrica de scores e política de dispatch (auto vs humano)
- Seed/provisionamento **só com autorização explícita**
