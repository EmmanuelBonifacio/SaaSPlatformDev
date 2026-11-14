# Agentes do SaaSPlatformDev

Este diretório organiza as instruções usadas por agentes de desenvolvimento. As regras definem os limites permanentes; as skills descrevem procedimentos para tipos específicos de trabalho.

## Precedência

1. Requisitos de segurança, privacidade e autorização do usuário.
2. Regras obrigatórias em `.agents/rules/`.
3. Arquitetura e fatos específicos documentados em `CLAUDE.md` e `rules/`.
4. Procedimento da skill aplicável em `.agents/skills/`.
5. Preferências locais da tarefa, desde que compatíveis com os itens acima.

Se duas fontes aplicáveis forem incompatíveis, não escolha silenciosamente nem implemente uma suposição arriscada. Explique o conflito, indique os arquivos envolvidos e solicite decisão quando ela afetar comportamento, segurança, dados, dependências ou produção. Uma skill não pode relaxar uma regra obrigatória.

`CLAUDE.md` permanece a referência de arquitetura do projeto. Regras deste diretório complementam esse documento e prevalecem quando uma instrução nele conflitar com um controle de segurança. Não replique aqui fatos de arquitetura sem necessidade.

## Regras permanentes

- `rules/governance.md`: autorização, fluxo de trabalho e gestão de conflitos.
- `rules/security.md`: segurança mínima obrigatória para todo código.
- `rules/architecture.md`: limites de arquitetura e dados sensíveis do projeto.
- `rules/data-integrity.md`: concorrência, transações e idempotência.
- `rules/testing.md`: estratégia de testes e ambientes seguros.

## Skills de execução

| Skill | Quando usar |
|---|---|
| `implement-feature` | Criar ou alterar funcionalidades |
| `safe-refactor` | Refatorar preservando comportamento |
| `antigravity-security` | Aplicar checklist-base de segurança durante desenvolvimento e revisão |
| `security-audit` | Auditar segurança sem corrigir antes da aprovação |
| `threat-modeling` | Avaliar riscos de uma feature, fluxo ou arquitetura |
| `access-control-tenancy` | Implementar ou revisar autorização e isolamento de tenant |
| `payments-idempotency` | Alterar pagamentos, webhooks ou operações repetíveis |
| `secure-secrets` | Analisar, configurar ou rotacionar segredos |
| `secure-api-design` | Criar ou revisar APIs HTTP |
| `database-security` | Revisar banco, migrations, isolamento e backups |
| `privacy-data-protection` | Avaliar dados pessoais e ciclo de vida |
| `vulnerability-management` | Tratar achados de scanners e dependências |
| `security-incident-response` | Responder a suspeita ou confirmação de incidente |
| `security-metrics` | Medir e reportar postura de segurança e governança |
| `release-deploy` | Preparar ou executar uma release/deploy |
| `server-operations` | Configurar ou alterar servidor/infraestrutura |

Skills orientam o agente; não são, por si sós, controles técnicos de CI ou bloqueios de produção. Só declare uma verificação como automatizada quando houver ferramenta e execução comprováveis.

## Uso seguro

- Antes de qualquer mudança, consulte as regras permanentes e a skill aplicável.
- Auditoria é somente leitura até que o usuário aprove correções.
- Mudanças de banco, cobrança, autenticação, autorização, segredos e produção exigem plano prévio e aprovação explícita.
- Nunca inclua valores secretos, tokens, dados pessoais ou conteúdo sensível em relatórios, exemplos, logs ou saída de ferramentas.
- Não execute deploy, migration de produção, rotação de credenciais, limpeza de dados ou mudança irreversível sem autorização específica.
