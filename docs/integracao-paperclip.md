# Integração local do Paperclip

Esta integração adiciona um atalho do dashboard SaaS para uma instância
Paperclip separada. O Paperclip mantém seu próprio login, usuários e empresas;
nenhum JWT ou sessão do SaaS é encaminhado para ele.

## Preparar e iniciar

1. Copie `paperclip-dev.env.example` para `.env.paperclip`.
2. Gere três valores independentes com `openssl rand -hex 32` e use-os,
   respectivamente, em `PAPERCLIP_DB_PASSWORD`, `BETTER_AUTH_SECRET` e
   `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET`. Não reutilize chaves de outros
   ambientes. Restrinja o arquivo com `chmod 600 .env.paperclip`.
3. Inicie somente os dois containers do Paperclip:

   ```sh
   docker compose --env-file .env.paperclip -f docker-compose.paperclip.yml up -d
   ```

4. Acesse `http://localhost:3100`, crie a conta Paperclip e conclua
   imediatamente **Claim this instance**. O modo `authenticated/private` exige
   login e mantém o fluxo inicial de reivindicação do primeiro administrador.
5. Para desligar sem apagar os dados, execute:

   ```sh
   docker compose --env-file .env.paperclip -f docker-compose.paperclip.yml down
   ```

Os dados do PostgreSQL e do Paperclip persistem em volumes Docker. O banco não
publica uma porta; a interface Paperclip é publicada somente em `127.0.0.1`.
Não monte o código-fonte do SaaS nem o socket do Docker no container Paperclip.

## Habilitar no dashboard

No backend, configure o `.env` normal e rode `npm run db:seed:modules` para
atualizar apenas o catálogo de módulos; esse comando não reseta credenciais do
administrador. No painel Admin, abra o tenant desejado e habilite **Paperclip
Agentes**. A integração não habilita o módulo automaticamente para tenants
novos. Ao criar um tenant, o módulo pode ser selecionado explicitamente.

O frontend usa `http://localhost:3100` em desenvolvimento. Se mudar a porta,
mantenha `PAPERCLIP_PORT` e `PAPERCLIP_PUBLIC_URL` alinhados e configure
`NEXT_PUBLIC_PAPERCLIP_URL` no ambiente do frontend com a mesma URL. Em builds
de produção, URLs configuradas precisam usar HTTPS; nenhum serviço ou deploy de
produção é criado por esta configuração.

## Limites de segurança e isolamento

- Habilitar o módulo controla apenas a exibição do atalho no SaaS. A autorização
  real é feita pelo Paperclip, com contas, convites, empresas e memberships
  independentes.
- Não compartilhe uma conta Paperclip entre clientes SaaS. Antes de liberar o
  acesso a outros tenants, crie e valide empresas e memberships separados no
  Paperclip. Esta integração não sincroniza tenants nem garante isolamento de
  dados entre clientes no Paperclip.
- A instância é adequada para desenvolvimento local e uso interno controlado,
  não para exposição pública. Não encaminhe a porta por proxy ou firewall.

O container usa o digest publicado para o commit
`647641a99bdb1d2d83acfd4ac66e02b070ef8ac3` do Paperclip. Consulte a
[documentação oficial Docker](https://github.com/paperclipai/paperclip/blob/647641a99bdb1d2d83acfd4ac66e02b070ef8ac3/doc/DOCKER.md)
e os [modos de implantação e autenticação](https://github.com/paperclipai/paperclip/blob/647641a99bdb1d2d83acfd4ac66e02b070ef8ac3/doc/DEPLOYMENT-MODES.md)
antes de alterar esta configuração.
