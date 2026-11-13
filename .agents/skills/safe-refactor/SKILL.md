---
name: safe-refactor
description: Decompor código com risco controlado, preservando comportamento e contratos públicos.
---

# Refatoração segura

## Procedimento

1. Leia as regras e o padrão do módulo; delimite arquivo, comportamento e contratos públicos.
2. Mapeie funções/componentes em UI, regra de negócio e acesso a dados/serviços externos; identifique acoplamento, estado compartilhado e duplicação.
3. Verifique testes existentes. Se faltar cobertura de comportamento observável importante, proponha testes de caracterização antes da mudança.
4. Não characterize nem preserve vulnerabilidade como requisito. Registre comportamento inseguro ou bug em lista separada e peça decisão sobre correção.
5. Proponha arquivos/pastas compatíveis com padrões atuais, sequência de passos pequenos, testes por passo e critérios de rollback. Aguarde aprovação antes de iniciar.
6. Execute um passo por vez; preserve nomes e contratos públicos, rotas, props, tabelas e comportamento, salvo autorização expressa.
7. Rode testes relevantes após cada etapa e inspecione o diff antes de prosseguir.

Não adicione framework ou dependência. Não misture refatoração com correção de regra de negócio. Se os testes falharem, pare, reporte e não esconda a falha com mocks ou alterações de comportamento não aprovadas.
