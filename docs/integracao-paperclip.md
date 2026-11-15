# [HISTÓRICO] Integração Paperclip — desligada (SP-7 fase 5)

A ponte HTTP para um serviço Paperclip externo/separado foi **desligada**.

Use o runtime nativo:

- API: `/agents`
- Docs: [docs/agents/agents-api-v1.md](./agents/agents-api-v1.md), [agents-client.md](./agents/agents-client.md), [agents-cutover.md](./agents/agents-cutover.md)

Não configure `PAPERCLIP_API_URL` nem suba `docker-compose.paperclip.yml` para o produto SaaS.

Tabelas legadas `paperclip_*` nos schemas de tenant **não são removidas** automaticamente.
