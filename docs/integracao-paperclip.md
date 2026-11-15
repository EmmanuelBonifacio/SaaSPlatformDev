# Agentes de IA integrados ao SaaS

O módulo **Agentes de IA** apresenta agentes, tarefas e conversas com o Paperclip
dentro do painel autenticado do tenant. A interface do Paperclip não é publicada
nem há login, registro ou sessão independente: o navegador chama somente a API
do SaaS, que usa o JWT autenticado e deriva o tenant do token.

O backend fala com o Paperclip via
[`@saasplatform/paperclip-agent-sdk`](../packages/paperclip-agent-sdk)
(`createAgentClient`). Detalhes de arquitetura:
[docs/modules/paperclip/](./modules/paperclip/).

**Fork Paperclip do projeto:**
[EmmanuelBonifacio/paperclip](https://github.com/EmmanuelBonifacio/paperclip)
(`master`). O worker servidor autentica `agent_sdk_keys` nesse fork — não no
upstream `paperclipai`.

## Dual mode: `local_trusted` vs `apiKey`

| Modo | Env | Quando | Segurança |
|------|-----|--------|-----------|
| `local_trusted` | `PAPERCLIP_AUTH_MODE=local_trusted` (default dev) | Compose local / loopback | Sem Bearer; **somente** se a API não for pública. **Bloqueado** com `NODE_ENV=production`. |
| `apiKey` | `PAPERCLIP_AUTH_MODE=apiKey` + `PAPERCLIP_API_KEY` | Produção / alvo com o fork autenticado | `Authorization: Bearer …`; chave só no servidor SaaS |

`local_trusted` **não** é o SDK autenticado. O caminho alvo é `apiKey` assim que
o fork validar chaves SDK.

## Preparar o Paperclip local

1. Copie `paperclip-dev.env.example` para `.env.paperclip`.
2. Gere valores independentes com `openssl rand -hex 32` para
   `PAPERCLIP_DB_PASSWORD` e `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET`. Restrinja
   o arquivo ao usuário local.
3. Inicie os containers:

   ```sh
   docker compose --env-file .env.paperclip -f docker-compose.paperclip.yml up -d
   ```

4. No ambiente privado do backend:

   ```bash
   PAPERCLIP_API_URL=http://127.0.0.1:3100
   PAPERCLIP_AUTH_MODE=local_trusted
   ```

   Quando o fork estiver com SDK keys:

   ```bash
   PAPERCLIP_AUTH_MODE=apiKey
   PAPERCLIP_API_KEY=pcp_sdk_...   # nunca no frontend / NEXT_PUBLIC_*
   ```

5. Prepare os schemas de tenants já existentes uma vez após atualizar o código:

   ```sh
   cd apps/backend
   npm run db:migrate:paperclip
   ```

O provisionador cria as tabelas necessárias para tenants novos. A migração é
aditiva e idempotente; ela não cria empresas nem altera conversas existentes.
Não rode contra produção sem o processo aprovado de backup, validação e janela
de mudança.

## Habilitar e usar

No painel Admin, habilite **Agentes de IA** para o tenant. O backend cria a
empresa Paperclip associada ao tenant no primeiro acesso autenticado ao módulo.
Os usuários podem consultar agentes e tarefas e iniciar conversas.

Cada conversa é uma tarefa Paperclip privada, vinculada ao usuário autenticado
no schema daquele tenant. Tarefas operacionais são compartilhadas no tenant;
conversas pertencentes a outros usuários não são retornadas pelo SaaS. Mensagens
usam identificador de requisição para evitar duplicação em reenvios.

## Fronteira de segurança

- Em `local_trusted`, o Paperclip não autentica cada chamada. Por isso,
  **somente o backend** pode alcançar sua API. Não encaminhe a porta por proxy,
  firewall ou rede pública.
- Em `apiKey`, o Paperclip (fork Emmanuel) deve rejeitar chamadas sem chave SDK
  válida, mesmo com UI/`ENABLE_AUTH` desligados.
- O compose local publica a API apenas em `127.0.0.1` para o backend em
  desenvolvimento executado no host. Em produção, use somente uma rede privada
  entre backend e Paperclip e não publique a porta do Paperclip.
- Todas as rotas do módulo exigem JWT, tenant ativo e módulo habilitado. O
  backend seleciona a empresa por tenant e valida a propriedade das conversas
  por usuário em cada leitura e escrita.
- Não envie JWT SaaS, IDs de empresa ou credenciais do Paperclip pelo navegador.
- Desabilitar o módulo no Admin bloqueia também as rotas de API, não apenas o
  item da navegação.

Contrato servidor / patches de referência:
[modules/paperclip/paperclip-upstream-patches/](./modules/paperclip/paperclip-upstream-patches/).

O container Paperclip permanece fixado ao digest configurado em
`docker-compose.paperclip.yml` até a imagem do fork autenticado estar pronta.
Consulte a documentação correspondente à versão fixada antes de atualizar.

## Planejamento para futuro deploy em VPS

Esta seção registra a topologia recomendada; **não significa que a VPS ou uma
configuração de produção já estejam preparadas**.

Para a primeira implantação, SaaS, backend, Paperclip e banco do Paperclip podem
ficar na mesma VPS, em containers separados. O proxy HTTPS público encaminha
somente para as aplicações SaaS. O backend acessa o Paperclip por uma rede
privada de containers; o banco do Paperclip fica acessível apenas ao Paperclip.
Não publique portas do Paperclip ou do banco no host.

Em produção use `PAPERCLIP_AUTH_MODE=apiKey` (o boot do backend rejeita
`local_trusted` quando `NODE_ENV=production`). Revise TLS, segredos, limites,
logs e backups antes de qualquer deploy.
