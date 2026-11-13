---
name: data-integrity
description: Regras obrigatórias para concorrência, transações, idempotência e efeitos externos.
always_on: true
---

# Integridade e concorrência

- Para cada fluxo que lê, decide e grava sobre recurso limitado (estoque, saldo, cupom, vaga, convite, pedido ou contador), avalie explicitamente requisições concorrentes.
- Prefira garantias no banco: constraint única apropriada; atualização condicional atômica e verificação das linhas afetadas; ou transação com lock de linha quando a regra multi-etapa exigir.
- A constraint deve refletir o escopo do domínio (incluindo tenant quando aplicável). Antes de adicionar uma constraint, verifique dados existentes e apresente o plano de resolução; não apague nem altere dados automaticamente.
- Não introduza Redis, locks em memória, fila ou nova infraestrutura quando uma garantia transacional do banco for suficiente. Explique e peça aprovação se a arquitetura atual não puder satisfazer a propriedade necessária.
- Operações repetíveis devem ter chave de idempotência persistida e escopada ao ator/tenant/operação pertinente. Não use e-mail, CPF ou outro dado pessoal como chave.
- Para operações externas, persista a chave do provedor para retries da mesma operação. Não gere uma chave nova em cada tentativa.
- Webhooks devem validar assinatura usando o corpo bruto antes de processamento. Deduplicação e processamento precisam ser duráveis e recuperáveis; não marque um evento como concluído antes dos efeitos locais necessários estarem seguros.
- Ao combinar mudanças no banco com e-mail, gateway ou outro efeito externo, considere falhas parciais. Use mecanismo durável já existente (por exemplo, outbox) quando disponível; não afirme entrega externa “exatamente uma vez”.
- Teste replays sequenciais e concorrentes contra banco isolado real nos fluxos críticos; mocks não provam constraints, locks, transações ou isolamento.
