---
name: testing-standards
description: Estratégia obrigatória de testes, fixtures e ambientes seguros para o SaaSPlatformDev.
always_on: true
---

# Estratégia de testes

- Escolha o menor teste que prova o requisito, sem substituir testes de integração por mocks quando o comportamento depende de Fastify, PostgreSQL, Prisma, tenancy, constraints ou transações.
- Testes unitários verificam lógica isolada; testes de integração devem atravessar a rota real e o banco de teste quando necessário; E2E cobre jornadas de usuário selecionadas. São complementares.
- Fluxos críticos de auth, autorização, isolamento de tenant, pagamento e mutação de recursos limitados precisam de testes de integração focados. Inclua tentativas negadas e limites entre tenants.
- Testes de concorrência devem sincronizar requisições simultâneas e verificar o efeito persistido, não depender de uma janela de tempo exata.
- Use apenas banco de teste isolado, com migrations e dados descartáveis. Nunca execute testes, seeds, limpeza ou cenários de RLS contra produção.
- Limpe os dados do teste de forma escopada e determinística. Não use fixtures reais ou segredos reais.
- Não reduza ou desabilite controles para facilitar o teste. Quando um teste depender de serviço externo, substitua apenas essa fronteira e declare o que ficou fora da verificação.
- Antes de refatorar, confira testes existentes; crie testes de caracterização para contratos observáveis ausentes. Não preserve comportamento comprovadamente inseguro sem separar e reportar o risco.
- Informe comando, escopo, resultado e limitações. Nunca declare teste não executado como aprovado.
