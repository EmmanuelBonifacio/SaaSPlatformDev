---
name: secure-api-design
description: Projetar ou revisar rotas HTTP seguras, validando autorização, inputs, abuso de recursos e respostas.
---

# Projeto seguro de APIs

## Procedimento

1. Identifique consumidor, autenticação, tenant, dados retornados, operações mutáveis, integrações e exposição pública.
2. Siga os padrões Fastify existentes; use schemas de validação do projeto para params, query e body, com limites de tamanho, paginação e formato.
3. Faça autorização no servidor em cada rota e objeto; teste acesso negado, outro tenant e IDOR/BOLA. Não use UUID ou CORS como autorização.
4. Derive valores e permissões críticos no servidor. Restrinja campos mutáveis para evitar mass assignment e não retorne campos internos/sensíveis.
5. Avalie rate limit, enumeration, timing, custo de consultas, regex, cache, erros, logs, SSRF, upload, CORS e proteção de browser conforme o fluxo.
6. Para integrações HTTP, valide destino/host, protocolo, redirects, timeout, tamanho e resposta; bloqueie acesso a destinos internos conforme arquitetura e biblioteca.
7. Teste autenticação/autorização positiva e negativa, input inválido, limites, erros e cenários de tenant no nível adequado.

Não relaxe autenticação, schema ou CORS para fazer teste passar. Mudanças em contrato público exigem plano e aprovação quando afetarem clientes ou segurança.
