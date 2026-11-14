# Relatório técnico — SaaSPlatformDev

**Data do levantamento:** 13/11/2026  
**Escopo:** estrutura e tecnologias identificáveis no repositório atual. Este documento descreve o estado observado nos arquivos-fonte e manifests; não é uma auditoria de segurança nem uma confirmação de que o sistema está implantado em produção.

## 1. Resumo executivo

O SaaSPlatformDev é um monorepo que reúne uma API em Node.js/Fastify, um painel web em Next.js, uma base PostgreSQL e arquivos de infraestrutura Docker. A arquitetura foi desenhada para atender várias empresas (tenants) em uma única aplicação, mantendo os dados de cada empresa em um schema PostgreSQL separado.

No código inspecionado, o núcleo implementado inclui autenticação, administração de tenants, consulta de módulos habilitados e o módulo FinIA, com operações financeiras e integração prevista/configurada com Evolution API para WhatsApp. O frontend atual contém páginas de entrada, administração, login e dashboard/configurações do tenant, incluindo páginas FinIA.

Há documentação no repositório que descreve outros módulos — como estoque, frota, rotas, TV digital e aplicativo móvel — mas eles não foram confirmados como aplicações/rotas implementadas na estrutura examinada. Por isso, são identificados neste relatório como documentação legada, planejada ou ainda não verificada, e não como funcionalidades entregues.

## 2. Objetivo e proposta do sistema

O projeto busca oferecer uma base SaaS multiempresa com:

- cadastro e administração central de tenants;
- ativação de módulos e associação a planos;
- separação de dados por empresa;
- painel web para acesso administrativo e do tenant;
- API para autenticação, administração e funcionalidades de negócio;
- execução local e publicação conteinerizada.

Em uma implantação SaaS, o administrador global gerencia os tenants; cada tenant acessa o sistema por um identificador amigável (slug) e recebe as funcionalidades habilitadas para sua conta.

## 3. Arquitetura atual

```text
Navegador
   │
   ├── Painel Next.js (porta 3001)
   │       └── Axios → API Fastify (porta 3000)
   │                          ├── PostgreSQL: schema public
   │                          └── PostgreSQL: schema tenant_<nome>
   │
   └── Em produção: Nginx termina HTTPS e encaminha para frontend/API

Desenvolvimento Docker observado:
PostgreSQL + pgAdmin + Evolution API
```

### Fluxo típico de uma requisição autenticada de tenant

1. A pessoa acessa uma rota com slug, por exemplo `/<slug>/dashboard`.
2. O layout do Next.js verifica a presença e a expiração do JWT no navegador e protege as páginas do tenant.
3. O cliente Axios centraliza as chamadas para a API e adiciona o token de acesso no cabeçalho `Authorization`.
4. O Fastify recebe a requisição. O middleware de tenant identifica e valida o tenant associado à autenticação.
5. Os dados administrativos/globais são consultados no schema `public`. Para dados específicos de tenant, a arquitetura fornece `withTenantSchema()`.
6. A API devolve o resultado em JSON; o frontend atualiza a tela.

### Isolamento de dados

O banco PostgreSQL usa dois níveis:

- **`public`:** dados compartilhados de controle, como tenants, módulos, planos e administradores.
- **`tenant_<slug>`:** dados específicos de cada empresa.

O helper `withTenantSchema()` abre uma transação e define `SET LOCAL search_path` para o schema do tenant. Como a configuração é local à transação, ela é restaurada ao término. O nome do schema passa por validação antes de ser aplicado. O provisionador de tenants cria o schema e suas tabelas com SQL.

## 4. Tecnologias por parte do sistema

### Backend — `apps/backend/`

| Tecnologia | Uso observado |
|---|---|
| Node.js 20 | Runtime indicado no Dockerfile. |
| TypeScript 5.7 | Linguagem do backend, com compilação via `tsc`. |
| Fastify 5 | Servidor HTTP e registro de rotas/plugins. |
| PostgreSQL 15 | Persistência relacional, incluindo schemas por tenant. |
| Prisma 6 | Client tipado e migrations para o schema global; dados de tenants também usam SQL de provisionamento e `search_path`. |
| Zod | Validação de variáveis de ambiente e dados de entrada. |
| JWT (`@fastify/jwt`) | Emissão e validação de tokens. |
| bcrypt | Hash e verificação de senhas. |
| Socket.IO | Dependência declarada; o uso em produção precisa ser confirmado módulo a módulo. |
| Plugins Fastify | Cookie, CORS, Helmet, rate limit, multipart e arquivos estáticos. |
| Vitest / tsx | Testes e execução em modo de desenvolvimento. |
| Evolution API | Serviço declarado no Compose de desenvolvimento para integração WhatsApp. |

O código organiza responsabilidades em rotas, controllers, services e repositories onde esses arquivos existem. `server.ts` registra os plugins e configura logging, segurança HTTP, CORS, limites, uploads, saúde da aplicação, tratamento de erros e rotas principais.

### Frontend — `apps/frontend/`

| Tecnologia | Uso observado |
|---|---|
| Next.js 15 App Router | Aplicação web, páginas e layouts por slug/área administrativa. |
| React 18 e TypeScript | Componentes e lógica de interface. |
| Tailwind CSS 3 | Estilização. |
| Axios | Cliente HTTP compartilhado, com interceptors para token, erros e upload multipart. |
| TanStack Query 5 | Dependência disponível para estado/cache de dados remotos. |
| Radix UI | Primitivos acessíveis de interface. |
| Leaflet / React Leaflet | Dependências instaladas para mapas; telas funcionais de mapa não foram confirmadas no inventário atual. |
| dnd-kit e Lucide React | Dependências para interação drag-and-drop e ícones. |

As páginas encontradas incluem a landing page, login e área administrativa, além de login, dashboard, configurações e FinIA na área dinâmica `/<slug>/`. O layout de tenant checa o token e limpa a sessão local quando o slug muda.

### Banco de dados — Prisma e PostgreSQL

O arquivo `schema.prisma` modela os dados globais, incluindo tenants, módulos, planos e administradores. O provisionador executa DDL para schemas de tenants; por isso, o Prisma não representa sozinho toda a estrutura dinâmica de cada cliente.

Esse desenho tem uma responsabilidade operacional importante: alterações em tabelas globais devem acompanhar as migrations correspondentes; alterações no DDL de tenants precisam também ser refletidas no provisionamento e no tratamento de tenants já existentes.

### Infraestrutura e publicação

| Tecnologia | Uso observado |
|---|---|
| Docker / Docker Compose | Serviços locais e publicação dos containers. |
| Nginx 1.25 | Reverse proxy; encaminha subdomínios para API e frontend e configura HTTPS. |
| Certbot / Let's Encrypt | Emissão e renovação de certificados configuradas no Compose de produção. |
| Volumes Docker | Persistência do banco, uploads e certificados. |
| Imagens Node 20 Alpine | Builds multi-stage para backend e frontend. |

O Compose de desenvolvimento atual declara PostgreSQL, pgAdmin e Evolution API. O Compose de produção declara PostgreSQL, backend, frontend, Nginx e Certbot; o PostgreSQL não publica porta externa no arquivo. Os engines de frota descritos em documentos antigos não aparecem nesses dois arquivos Compose atuais.

### Projetos Laravel paralelos

O repositório também contém `apps/laravel-base/` e `apps/laravel-brain/`, separados da API Fastify. Os manifests declaram PHP 8.3 e Laravel 13; o segundo também declara Sanctum. Não foi identificada evidência, no escopo deste levantamento, de que esses projetos sejam executados como parte da API Node/Next ou da stack dos Compose raiz.

## 5. Como as partes foram construídas

### API e inicialização

`apps/backend/src/server.ts` cria a instância Fastify, instala plugins transversais e registra rotas. A aplicação expõe `/health`; também possui rotas auxiliares de desenvolvimento apenas quando `NODE_ENV` é `development`. As variáveis de ambiente são validadas no boot, e o processo encerra se valores obrigatórios estiverem ausentes ou inválidos.

### Autenticação

O módulo de autenticação separa rotas, controller, service, repository e schema. O service usa bcrypt para senhas e emite access token JWT e refresh token aleatório; há função para calcular hash SHA-256 do refresh token. O middleware de tenant e os middlewares de role/módulo fazem parte do núcleo. A persistência e o ciclo completo de refresh/logout devem ser verificados nos repositories e testes ao preparar uma descrição funcional definitiva.

### Administração e tenants

As rotas administrativas vivem em `apps/backend/src/admin/`, fora da pasta de módulos de negócio. O modelo global guarda tenants e módulos habilitados. O provisionador cria schemas e tabelas; middlewares validam o contexto do tenant para a API.

### FinIA

O módulo tem rotas, controller, service, tipos e schemas. As rotas cobrem dashboard, transações, contas fixas, dívidas, upload de extrato, QR code e webhooks WhatsApp. O service opera dentro do schema do tenant e usa serviços separados para integração de IA e Evolution API.

### Interface web

As páginas ficam no App Router. A área administrativa usa rotas `/admin`; a área do cliente usa `/<slug>/...`. O Axios é centralizado em `src/services/api.ts`, reduzindo duplicação de configuração entre os services de frontend. O Next é compilado em modo standalone para a imagem Docker.

## 6. Funcionalidades confirmadas no código examinado

- API Fastify com configuração de CORS, Helmet, rate limit, uploads e endpoint de health.
- Autenticação com JWT e bcrypt.
- Modelo global de tenants, módulos e planos.
- Middleware/contexto de tenant e helper para selecionar schema PostgreSQL por transação.
- Provisionamento de schema de tenant.
- Rotas administrativas de autenticação e gestão.
- Rotas de consulta de módulos/plano do tenant.
- Módulo FinIA com endpoints financeiros e webhooks WhatsApp.
- Interface Next.js com páginas de login, administração, dashboard/configurações do tenant e FinIA.
- Stack Docker de produção para API, frontend, PostgreSQL, Nginx e Certbot.

## 7. Itens descritos em documentação antiga, mas não confirmados como entregues

Os seguintes itens aparecem em materiais como `README.md` (versões antigas) ou `docs/estrutura-sistema.md`, mas não foram localizados como aplicações/rotas ativas na estrutura atual examinada:

- Aplicativo móvel Expo para motoristas (`apps/mobile/` não está presente no inventário atual).
- Módulos completos de estoque, vendas/WhatsApp comercial, TV digital, frota e otimização de rotas.
- Integração operacional com Traccar, Fleetbase, FleetMS, GraphHopper e VROOM.
- Rotas e telas de mapa/dispatch correspondentes a esses módulos.

Isso não prova que nunca tenham existido ou que não estejam em outra branch/implantação; significa apenas que não devem ser apresentados como ativos sem uma nova verificação. A documentação também contém referências de versões e escopo que não coincidem integralmente com os manifests e arquivos atuais.

## 8. Estado do projeto e próximos passos sugeridos

### Estado observado

O repositório apresenta um núcleo SaaS funcional em desenvolvimento: API, painel web, base de dados multi-tenant, administração e FinIA. A infraestrutura de produção está descrita em Docker Compose. O conjunto de módulos de negócio que aparece nas documentações mais amplas não está todo refletido na estrutura atual.

### Projeto de evolução sugerido

1. **Consolidar o escopo:** decidir quais módulos fazem parte da versão atual e quais são roadmap ou projetos paralelos.
2. **Alinhar a documentação:** revisar `README.md` e `docs/estrutura-sistema.md` para refletir rotas, aplicações, versões e serviços realmente mantidos.
3. **Fechar o inventário de funcionalidades:** para cada módulo aprovado, registrar telas, endpoints, tabelas, permissões e dependências externas.
4. **Validar fluxos essenciais:** provisionamento de tenant, login, isolamento de dados, administração e operações do FinIA.
5. **Completar testes e pipeline:** manter testes unitários de services/schemas e validar build, migrations e configuração de produção antes de deploy.
6. **Planejar módulos adicionais:** só incluir mobile, frota, estoque, TV ou outros quando houver código e infraestrutura confirmados para essas entregas.

## 9. Referências principais

- [Visão geral do repositório](../README.md)
- [Regras e arquitetura do projeto](../CLAUDE.md)
- [Estrutura do banco Prisma](../apps/backend/prisma/schema.prisma)
- [Inicialização da API](../apps/backend/src/server.ts)
- [Acesso ao banco e isolamento por tenant](../apps/backend/src/core/database/prisma.ts)
- [Provisionamento de tenant](../apps/backend/src/core/tenant/tenant.provisioner.ts)
- [Módulo FinIA — rotas](../apps/backend/src/modules/finia/finia.routes.ts)
- [Layout de tenant do frontend](../apps/frontend/src/app/[slug]/layout.tsx)
- [Cliente HTTP do frontend](../apps/frontend/src/services/api.ts)
- [Compose de desenvolvimento](../docker-compose.yml)
- [Compose de produção](../docker-compose.prod.yml)
