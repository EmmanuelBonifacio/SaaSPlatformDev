---
name: security-audit
description: Auditar superfícies de aplicação e produzir relatório de segurança sem alterar arquivos.
---

# Auditoria de segurança somente leitura

## Regras

- Comece em modo somente leitura. Não corrija, não crie migration, não instale scanners e não altere configuração durante a auditoria.
- Escopo de auditoria deve ser autorizado. Não faça varredura ativa contra produção ou sistema de terceiro sem autorização explícita e alvo confirmado.
- Não imprima ou copie segredos, dados pessoais, conteúdo de `.env`, tokens ou dumps.

## Escopo

Mapeie, conforme aplicável:

- autenticação, sessão, autorização por papel/objeto/tenant e IDOR/BOLA;
- validação e limites de inputs, uploads, injection, XSS, CSRF, SSRF, redirects e abuso de recursos;
- confiança no cliente, exposição de segredos e variáveis públicas;
- consultas, schemas PostgreSQL, isolamento tenant, permissões de banco, migrations e backup;
- concorrência, replay, idempotência, webhooks e efeitos externos;
- CORS, TLS, headers, rate limits, logs, mensagens de erro, dependências, CI/CD e operação.

Não presuma Supabase/RLS, ferramenta instalada, política existente ou cobertura. Identifique o mecanismo real do repositório. Use evidência estática; scanners dinâmicos só em ambiente de teste autorizado.

## Relatório

Para cada achado: ID, título, severidade (Crítica/Alta/Média/Baixa/Informativa), confiança, ativo/tenant afetado, evidência sanitizada com arquivo e linha, cenário de impacto, condição necessária, correção recomendada e teste de regressão.

Inclua também:

- resumo executivo e escopo/limitações;
- controles verificados e controles não verificáveis;
- riscos potenciais separados de vulnerabilidades confirmadas;
- plano de correção ordenado por risco/dependência;
- métricas de segurança aplicáveis e baseline necessário.

Conclua solicitando aprovação do plano. Nenhuma correção é aplicada nesta skill.
