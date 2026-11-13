---
name: agent-governance
description: Regras obrigatórias de autorização, escopo, precedência e comunicação para agentes neste repositório.
always_on: true
---

# Governança de agentes

## Antes de agir

- Leia `CLAUDE.md`, as regras relevantes em `rules/` e a skill aplicável em `.agents/skills/`.
- Inspecione o estado atual dos arquivos e preserve alterações preexistentes.
- Confirme o ambiente e o alvo antes de operar em banco, deploy ou servidor.
- Separe análise, proposta e execução. Não transforme um pedido de auditoria ou plano em autorização para editar.

## Aprovações obrigatórias

Apresente plano e aguarde aprovação explícita antes de:

- alterar autenticação, autorização, isolamento de tenant, cobrança ou regras de negócio financeiras;
- criar, alterar ou executar migrations e operações que modifiquem ou removam dados;
- instalar dependências, adicionar serviços/infraestrutura ou mudar configurações de segurança globais;
- executar deploy, comandos em produção, rotação de segredos ou ações com impacto externo;
- realizar uma refatoração quando o usuário exigir revisão do plano antes de cada etapa.

A aprovação de um plano não autoriza operações irreversíveis que não estejam claramente descritas nele. Em caso de dúvida sobre escopo ou ambiente, pare e pergunte.

## Auditorias e achados

- Uma auditoria deve começar como somente leitura e entregar achados com evidência, impacto, severidade, localização, recomendação e confiança.
- Não exponha segredos nos achados. Identifique o tipo/local e instrua rotação quando houver evidência de exposição.
- Diferencie vulnerabilidade confirmada, risco potencial e hipótese. Não declare cobertura, conformidade ou correção sem validação.
- Não altere controles existentes para fazer um teste passar. Relate falso positivo ou conflito com evidência.

## Mudanças de código

- Faça mudanças pequenas e relacionadas ao pedido; mantenha APIs, comportamento e padrões existentes, salvo autorização.
- Não misture refatoração com correção de bug. Registre achados fora de escopo separadamente.
- Relate arquivos alterados, verificações executadas, resultado e limitações.
- Se não for possível executar um teste, informe precisamente o motivo; não o apresente como aprovado.

## Bloqueio por conflito ou risco

Pare antes de agir se uma instrução exigir desabilitar TLS/certificado, auth, autorização, validação, isolamento, logging seguro ou outro controle para “fazer funcionar”; se houver divergência sobre produção; ou se um passo puder causar perda, duplicação ou exposição de dados. Explique o conflito e peça decisão.
