# Agentes de IA integrados ao SaaS

O módulo **Agentes de IA** apresenta agentes, tarefas e conversas com o Paperclip
dentro do painel autenticado do tenant. A interface do Paperclip não é publicada
nem há login, registro ou sessão independente: o navegador chama somente a API
do SaaS, que usa o JWT autenticado e deriva o tenant do token.

## Preparar o Paperclip local

1. Copie `paperclip-dev.env.example` para `.env.paperclip`.
2. Gere valores independentes com `openssl rand -hex 32` para
   `PAPERCLIP_DB_PASSWORD` e `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET`. Restrinja
   o arquivo ao usuário local.
3. Inicie os containers:

   ```sh
   docker compose --env-file .env.paperclip -f docker-compose.paperclip.yml up -d
   ```

4. Configure `PAPERCLIP_API_URL=http://localhost:3100` no ambiente privado do
   backend. O frontend não recebe a URL do Paperclip.
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

- O Paperclip roda em `local_trusted`: ele não autentica cada chamada. Por isso,
  **somente o backend** pode alcançar sua API. Não encaminhe a porta por proxy,
  firewall ou rede pública.
- O compose local publica a API apenas em `127.0.0.1` para o backend em
  desenvolvimento executado no host. Em produção, use somente uma rede privada
  entre backend e Paperclip e não publique a porta do Paperclip.
- Todas as rotas do módulo exigem JWT, tenant ativo e módulo habilitado. O
  backend seleciona a empresa por tenant e valida a propriedade das conversas
  por usuário em cada leitura e escrita.
- Não envie JWT SaaS, IDs de empresa ou credenciais do Paperclip pelo navegador.
  O serviço encaminha apenas operações permitidas e campos mínimos.
- Desabilitar o módulo no Admin bloqueia também as rotas de API, não apenas o
  item da navegação.

O container Paperclip permanece fixado ao digest configurado em
`docker-compose.paperclip.yml`. Consulte a documentação oficial correspondente
à versão fixada antes de atualizar a imagem ou ampliar as operações expostas.

## Planejamento para futuro deploy em VPS

Esta seção registra a topologia recomendada; **não significa que a VPS ou uma
configuração de produção já estejam preparadas**.

Para a primeira implantação, SaaS, backend, Paperclip e banco do Paperclip podem
ficar na mesma VPS, em containers separados. O proxy HTTPS público encaminha
somente para as aplicações SaaS. O backend acessa o Paperclip por uma rede
privada de containers; o banco do Paperclip fica acessível apenas ao Paperclip.
Não publique portas do Paperclip ou do banco no host e não crie regras de proxy
ou firewall que os exponham à internet.

Antes do deploy, crie e revise uma configuração de produção separada da
configuração local deste repositório. Confirme a rede efetivamente usada pelo
backend e Paperclip, a exposição de portas, proxy e firewall, TLS, armazenamento
de segredos, limites de recursos, logs e backups. O modo `local_trusted` não
autentica cada chamada à API: sua segurança depende de restringir o acesso à
rede privada e aos serviços autorizados. Não execute a migração de tenants nem
o deploy sem identificar o ambiente e aprovar o plano de dados e recuperação.

Uma VPS separada pode ser avaliada se os requisitos de isolamento ou a carga
justificarem a operação adicional. Nesse caso, a comunicação entre servidores
deve usar rede privada e controles de transporte apropriados; a API do
Paperclip não deve ser publicada diretamente na internet.
