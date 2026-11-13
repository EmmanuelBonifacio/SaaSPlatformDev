---
name: security-metrics
description: Definir e reportar métricas auditáveis de segurança, risco, remediação e governança sem inventar conformidade.
---

# Métricas e governança de segurança

## Princípios

- Cada métrica deve ter definição, numerador/denominador, fonte, período, responsável e limitação.
- Diferencie ausência de dados de resultado zero. Não trate scanner não executado como “sem vulnerabilidades”.
- Segmente por severidade, aplicação/ambiente e exposição quando isso não revelar dados sensíveis.
- Métrica não é prova de segurança nem meta individual para incentivar fechamento superficial.
- Só reporte valor medido com evidência. Marque estimativas, metas propostas e dados indisponíveis separadamente.

## Painel mínimo recomendado

| Métrica | Definição | Meta inicial proposta |
|---|---|---|
| Achados críticos/altos abertos na release | Contagem confirmada e sem exceção válida por severidade | 0 críticos e altos na produção; exceção requer aprovação, compensação e expiração |
| Tempo de remediação (MTTR) | Mediana e P90 entre confirmação e validação da correção, por severidade | Crítico: contenção em até 24h; correção/mitigação em até 7 dias. Alto: até 14 dias. Médio: até 30 dias. Baixo: até 90 dias |
| Exceções vencidas | Exceções sem responsável ou após data de expiração | 0 |
| Segredos ativos expostos | Credenciais confirmadas em locais públicos/cliente e ainda válidas | 0; rotação imediata conforme incidente |
| Rotas críticas com testes de autorização | Rotas críticas com testes positivos e negativos / total de rotas críticas inventariadas | 100% antes de release que as afete |
| Fluxos críticos com integração | Fluxos de auth, tenancy, pagamento e recursos limitados cobertos por integração apropriada / inventário | 100% dos fluxos críticos identificados; declarar lacunas |
| Testes de isolamento entre tenants | Cenários cross-tenant de leitura/escrita executados e aprovados / cenários definidos | 100% dos cenários críticos por release afetada |
| Dependências avaliadas | Manifestos/lockfiles cobertos por auditoria no período / total no escopo | 100% por release; registrar falhas e advisories |
| Releases com evidência de segurança | Releases com testes, scan e aprovação exigidos registrados / releases | 100% das releases de produção |
| Backups restauráveis | Restaurações de teste concluídas / restaurações planejadas | Alvo inicial: 100% dos testes trimestrais planejados; confirmar RPO/RTO com negócio |
| Incidentes recorrentes | Incidentes com causa raiz repetida no período | Tendência decrescente; definir baseline antes de meta numérica |

Metas são propostas iniciais, não fatos ou certificação. Altere-as apenas com dono de risco, racional, prazo e aprovação. MTTR mede tempos separadamente para contenção e correção para evitar confusão.

## Governança operacional

- Defina proprietário do serviço, responsável por risco, aprovador de exceção e canal de incidente.
- Toda exceção inclui achado, justificativa, controle compensatório, responsável, data de expiração e plano de remoção.
- Revise métricas mensalmente e após incidente relevante; revisar riscos/exceções ao menos trimestralmente.
- Mantenha inventário de ativos, fluxos críticos, rotas sensíveis e ambientes para que denominadores sejam verificáveis.
- Não misture ambientes de teste e produção; scanners dinâmicos usam homologação autorizada.

## Formato do relatório

Informe período, escopo, fonte/comando, valores medidos, metas, tendência somente quando houver histórico comparável, dados ausentes, exceções e ações com responsável/prazo. O `scripts/security-scan.sh` existente não verifica todas essas métricas; não o apresente como prova completa.
