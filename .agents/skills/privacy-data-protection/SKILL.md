---
name: privacy-data-protection
description: Avaliar minimização, finalidade, acesso, retenção e exposição de dados pessoais em funcionalidades e operações.
---

# Privacidade e proteção de dados

## Procedimento

1. Inventarie os dados pessoais/sensíveis envolvidos, origem, finalidade, usuários/tenants com acesso, destinatários e ciclo de vida.
2. Questione necessidade: colete e retorne apenas o mínimo; não use dados pessoais em logs, métricas, chaves de idempotência ou identificadores de teste.
3. Verifique autorização, segregação tenant, exportação, exclusão, retenção, backup e compartilhamento com terceiros no contexto real do sistema.
4. Minimize campos selecionados e serializados, redija logs e proteja dados em trânsito/repouso conforme os controles realmente configurados.
5. Para analytics, logs e telemetria, remova ou agregue identificadores quando possível; avalie reidentificação e acesso operacional.
6. Registre riscos, retenção e dependências. Mudanças de política de dados, exclusão em massa ou compartilhamento externo exigem aprovação.

Não declare conformidade legal ou base legal por inferência. Escale dúvidas regulatórias ao responsável jurídico/privacidade.
