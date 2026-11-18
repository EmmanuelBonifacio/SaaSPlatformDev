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
| 1 | SEO Master Agent | `seo_master` | TBD (Growth/Marketing Lead) | draft — `agents/seo-master.md` |
| 2 | Sitemap Agent | `sitemap` | `seo_master` | draft — `agents/sitemap.md` |
| 3 | Robots Agent | `robots` | `seo_master` | draft — `agents/robots.md` |

## Org chart (provisório)

```
[Growth Lead — TBD]
 └── SEO Master (seo_master)
      ├── Sitemap (sitemap)   # descoberta de URLs
      └── Robots (robots)     # política de crawl
```

## Próximos prompts esperados

- Schema / Meta / Conteúdo / Local / AEO / Indexação
- Skills compartilhadas vs. instruções por agente
- Confirmar hierarquia completa
