---
name: payments-idempotency
description: Revisar e implementar comportamento idempotente para pagamentos, webhooks e operações financeiras.
---

# Idempotência de pagamentos

## Procedimento

1. Faça inventário de webhooks, criação/captura/reembolso de cobranças, liberação de planos/créditos, pedidos e notificações transacionais.
2. Antes de alterar, apresente plano e aguarde aprovação. Não altere preços, valores, regras de cobrança ou contratos do gateway sem autorização explícita.
3. Verifique assinatura do webhook sobre corpo bruto antes de processar qualquer dado.
4. Persista identificador do evento com constraint única e estado de processamento recuperável. Deduplicação, efeitos locais necessários e conclusão devem ser transacionais quando possível.
5. Não marque evento concluído antes de assegurar os efeitos necessários. Planeje retries após falha; confirme 2xx somente quando a aceitação estiver durável conforme protocolo do provedor.
6. Não dependa da ordem dos eventos. Quando o evento puder estar desatualizado, recupere o estado autoritativo no gateway se a API e o contrato permitirem.
7. Para chamadas de saída, persista e reutilize a chave de idempotência da operação de negócio em retries. Não recrie por tentativa nem derive de e-mail/CPF.
8. Para endpoints do app, escopo da chave inclui tenant/ator e operação. Guarde vínculo com payload normalizado e resultado conforme política de retenção; rejeite a mesma chave com payload incompatível.
9. E-mail e efeitos externos não oferecem “exactly once” genericamente. Use mecanismo durável existente, como outbox quando disponível, e torne o consumidor seguro para retry.
10. Teste repetição sequencial, simultânea, conflito de chave/payload, falha entre persistência e efeito e recuperação, usando banco isolado real.

Não adicione Redis/fila/outbox nova sem demonstrar a lacuna do mecanismo existente e obter aprovação.
