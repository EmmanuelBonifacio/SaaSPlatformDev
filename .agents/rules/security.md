---
name: security-rules
description: Controles de segurança obrigatórios para toda análise, geração e alteração de código neste repositório.
always_on: true
---

# Regras obrigatórias de segurança

Estas regras complementam o checklist detalhado em `CLAUDE.md` e não o substituem. Consulte também a skill `.agents/skills/antigravity-security/SKILL.md` e as skills especializadas quando aplicáveis.

## Precedência

Segurança, privacidade, autorização, integridade de dados e limites operacionais prevalecem sobre preferências de estilo, estética, animação, conveniência ou completude funcional. Nenhuma skill ou requisito da tarefa autoriza enfraquecer esses controles. Se houver conflito, não implemente a parte insegura; explique o motivo e proponha uma alternativa segura. A hierarquia completa está em `.agents/README.md`.

## Princípios obrigatórios

- **Confiança zero no cliente:** tudo que vem do browser pode ser alterado ou forjado. O servidor valida e autoriza cada operação e recalcula valores que afetem cobrança, saldo, plano, permissão ou limite.
- **Autenticação e autorização:** proteja cada rota de acordo com sua sensibilidade; valide o acesso ao objeto e ao tenant em cada operação (defesa em profundidade). UUID não substitui autorização.
- **Validação:** valide parâmetros, query, body, headers e uploads no servidor usando os schemas e limites próprios do projeto. Use consultas parametrizadas/Prisma; nunca concatene entrada em SQL.
- **Segredos:** nunca exponha segredos em código cliente, bundles, logs ou relatórios. Use a configuração validada do backend. Variáveis com prefixos públicos (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_` ou equivalentes) são públicas por definição; coloque nelas apenas valores deliberadamente públicos.
- **TLS:** preserve verificação de certificados. Não use `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0` ou mecanismo equivalente como correção.
- **Multi-tenancy:** toda consulta de tenant respeita `withTenantSchema()` e a autorização do tenant autenticado. Não derive acesso apenas de slug ou ID controlado pelo cliente.
- **Dados:** minimize coleta, seleção, retenção e logging de dados pessoais; nunca exponha hashes de senha, tokens internos, credenciais ou dados de outro tenant.
- **Resiliência:** mudanças em fluxos de concorrência, cobrança e processamento repetível devem respeitar constraints, transações e idempotência definidas em `data-integrity.md`.
- **Headers e rede:** preserve configuração restritiva de CORS, HTTPS, CSP, HSTS e demais headers conforme o ambiente e a configuração existente. Não abra origem ampla para contornar erro.
- **Erros e observabilidade:** mensagens externas não devem revelar stack traces, SQL, tokens, dados pessoais ou detalhes internos. Registre eventos de segurança sem segredos e com contexto mínimo útil.

## Verificações orientadas a risco

- Considere OWASP Top 10 e riscos de API, especialmente BOLA/IDOR, autorização por função/tenant, injection, SSRF, XSS, CSRF, upload, rate limit, abuso de recursos e configuração insegura.
- Faça revisão de dependências e segredos com ferramentas disponíveis. Não instale scanners nem envie código, segredos ou dados do cliente a serviços externos sem aprovação.
- Scans dinâmicos devem ocorrer apenas em ambiente autorizado e não produtivo. Não execute testes intrusivos em produção.
- Criptografia em repouso, WAF, MFA, vault e scanners são controles dependentes da arquitetura; não afirme que existem sem evidência nem introduza serviço novo sem plano e aprovação.
- Nunca trate UUID, CORS, WAF ou validação de frontend como substitutos de autorização, validação no servidor ou isolamento no banco.

## Resposta a exposição

Se houver evidência de segredo exposto, não copie seu valor. Informe apenas tipo, local e contexto não sensível; recomende revogar/rotacionar pelo canal seguro, avaliar uso indevido e remover o segredo do histórico/distribuição conforme procedimento aprovado. Nunca execute rotação ou reescrita de histórico sem autorização.
