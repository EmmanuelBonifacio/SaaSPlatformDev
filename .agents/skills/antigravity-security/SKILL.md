---
name: antigravity-security
description: Checklist-base para aplicar segurança em desenvolvimento, revisão e preparação de mudanças neste SaaS multi-tenant.
---

# Segurança de aplicação — checklist-base

Use esta skill antes e durante qualquer desenvolvimento ou revisão com impacto em código. Ela complementa as regras always-on em `.agents/rules/security.md`; use skills especializadas para auditoria formal, ameaças, autorização, segredos, incidentes, métricas e deploy.

## 1. Contexto e ameaça

- Identifique dados, atores, fronteiras de confiança, tenant, operações sensíveis e dependências externas afetadas.
- Considere abuso por usuário autenticado, chamada direta à API, manipulação de IDs, concorrência, replay, falha parcial e configuração incorreta.
- Para mudança de maior risco, use `.agents/skills/threat-modeling/SKILL.md` antes de implementar.

## 2. Identidade, autorização e isolamento

- Verifique autenticação e autorização no servidor para cada rota e objeto; não confie em papel, tenant ou propriedade enviados pelo cliente.
- Proteja contra BOLA/IDOR. UUID é identificador, não mecanismo de permissão.
- Para dados de tenant, use o mecanismo `withTenantSchema()` e teste tentativas de leitura e escrita entre tenants.
- Restrinja operações administrativas e aplique menor privilégio.

## 3. Entrada, saída e dependências

- Valide inputs no servidor, limite tamanho/quantidade e use queries parametrizadas.
- Evite XSS, SSRF, CSRF, open redirect, upload inseguro, injection, mass assignment e abuso de recursos conforme o contexto.
- Codifique/escape saída conforme o contexto; não trate sanitização genérica como proteção universal.
- Preserve TLS com validação de certificado e restrinja CORS ao necessário.

## 4. Segredos, dados e logs

- Mantenha credenciais exclusivamente no servidor/configuração protegida, nunca em bundle cliente, repositório, logs ou relatório.
- Trate variáveis com prefixos públicos como publicáveis. Classifique chaves antes de usá-las; não assuma que um valor é seguro só por ter nome de “key”.
- Minimize dados pessoais e sensíveis armazenados, retornados e registrados; aplique redação de campos sensíveis no logger existente.
- Não inclua conteúdo de `.env`, dumps, tokens, dados reais ou credenciais em testes, exemplos ou prompts enviados a ferramentas externas.

## 5. Persistência, concorrência e pagamentos

- Avalie atomicidade e constraints para recursos limitados; confira o resultado de atualizações condicionais.
- Torne replays de webhooks/operações de negócio idempotentes e recuperáveis, sem confirmar processamento antes da persistência durável.
- Mantenha preço e estado financeiro autoritativos no servidor. Ver detalhes em `payments-idempotency` e nas regras de `data-integrity.md`.

## 6. Testes e evidências

- Escolha testes proporcionais ao risco. Para auth, tenancy, banco e concorrência, use integração com banco de teste isolado quando necessário.
- Teste autorização negativa, tentativas entre tenants, inputs inválidos, limites, retries e falhas parciais pertinentes.
- Rode scanners somente se já estiverem disponíveis e em alvo autorizado. Documente escopo, achados, falsos positivos e limitações.
- Consulte `CLAUDE.md` para comandos existentes; não assuma scripts ou ferramentas ausentes.

## 7. Critérios para interromper

Pare e reporte antes de implementar se a correção exigir desabilitar controles, adicionar infraestrutura/dependência, migrar/remover dados, alterar política de cobrança ou operar em produção. Apresente opções e aguarde aprovação.
