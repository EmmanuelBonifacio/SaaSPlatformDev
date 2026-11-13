---
name: threat-modeling
description: Identificar ameaças e controles antes de construir ou alterar fluxos, dados ou fronteiras de confiança.
---

# Modelagem de ameaças

## Procedimento

1. Delimite feature, ativos, atores, papéis, tenants, entradas, saídas, integrações e ambiente.
2. Desenhe o fluxo de dados e as fronteiras de confiança: browser/mobile, API, banco, serviços externos e operações.
3. Considere spoofing, tampering, repudiation, disclosure, denial of service e elevation of privilege, adaptando ao risco real.
4. Para cada ameaça, registre ator/capacidade, ativo, pré-condições, impacto, probabilidade, severidade, controle preventivo/detetivo e evidência/teste.
5. Verifique especialmente autorização por objeto e tenant, confiança em dados do cliente, replay/concorrência, segredos, falhas parciais, exposição de dados e abuso de endpoints.
6. Priorize mitigação por risco e viabilidade; identifique risco residual e controles que dependem de operação.
7. Apresente o modelo antes da implementação se a mudança envolver dados sensíveis, pagamentos, auth, tenancy, infraestrutura ou decisões arquiteturais.

Não use pontuação numérica como substituto de justificativa. Não trate ameaça hipotética como vulnerabilidade confirmada. Não introduza controles ou serviços sem verificar a arquitetura e pedir aprovação quando houver impacto.
