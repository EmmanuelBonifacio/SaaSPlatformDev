# [HISTÓRICO] Integração Paperclip — removida (SP-7)

A ponte HTTP Paperclip e o módulo legado foram **removidos**.

- API: `/agents` + `requireModule("agents")`
- UI: `/:slug/agents`
- Cutover: [docs/agents/agents-cutover.md](./agents/agents-cutover.md)
- Limpeza / DROP opt-in: [docs/agents/agents-cleanup.md](./agents/agents-cleanup.md)

Não use `PAPERCLIP_API_URL` nem compose Paperclip.
