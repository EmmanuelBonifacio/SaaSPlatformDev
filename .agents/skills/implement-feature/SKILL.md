---
name: implement-feature
description: Planejar, implementar e validar uma funcionalidade respeitando a arquitetura e os controles de segurança do repositório.
---

# Desenvolvimento seguro de funcionalidades

## Quando usar

Use ao criar uma funcionalidade, rota, componente, integração ou alteração de comportamento. Regras de `.agents/rules/` são obrigatórias independentemente desta skill.

## Procedimento

1. Leia `CLAUDE.md`, as regras relevantes em `rules/`, as regras `.agents/rules/` e os padrões do módulo existente.
2. Inspecione os call sites, contratos, testes e estado dos arquivos que serão alterados. Não sobrescreva trabalho preexistente.
3. Defina atores, tenant, dados sensíveis, fluxos de erro, concorrência, efeitos externos e critérios observáveis de aceite.
4. Para auth, tenancy, dados, pagamentos, dependências ou produção, apresente plano e aguarde aprovação conforme `governance.md`.
5. Implemente no padrão existente: validação no servidor, autorização por objeto/tenant, regra de negócio fora da UI/controller e queries seguras.
6. Adicione testes focados no comportamento introduzido. Use teste de integração para as garantias que mocks não conseguem provar.
7. Execute validações específicas do projeto para os arquivos alterados. Não afirme sucesso de comandos que não foram executados.
8. Revise o diff: escopo, segredos, erros, logs, permissões, migration, efeitos concorrentes e compatibilidade.

## Entrega

Informe resumo, arquivos tocados, comportamento de segurança relevante, testes/comandos e resultados, migrations ou ações ainda não executadas, riscos residuais e aprovações pendentes.

## Parar e pedir decisão

Pare se o pedido conflitar com arquitetura ou segurança, exigir mudança de regra financeira, depender de infraestrutura nova, tiver risco de perda de dados ou se o ambiente/escopo estiver ambíguo.
