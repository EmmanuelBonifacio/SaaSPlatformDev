# ENABLE_AUTH=false

Flag sugerida no fork `EmmanuelBonifacio/paperclip` para uso embutido pelo SaaS.

## Comportamento desejado

| Superfície | `ENABLE_AUTH=true` (default upstream) | `ENABLE_AUTH=false` |
|------------|----------------------------------------|---------------------|
| UI login / registro / sessão browser | Ativa | Desligada / não servida |
| API de integração SaaS | Board session **ou** SDK key | **Somente** `Authorization: Bearer pcp_sdk_…` |
| `local_trusted` implícito (loopback board) | Permitido em deploy local | Não autoriza rotas de integração SDK |

## Regras absolutas

1. `ENABLE_AUTH=false` **nunca** deixa a API aberta.
2. Ausência de chave → 401.
3. Chave revogada/expirada → 401.
4. Escopo insuficiente ou outra company → 403.
5. Segredos só em env/secret store do servidor; nunca no bundle UI.

## Compose SaaS atual

`docker-compose.paperclip.yml` já usa `SERVE_UI=false` e
`PAPERCLIP_DEPLOYMENT_MODE=local_trusted`. Quando o fork autenticar SDK keys,
o backend SaaS muda para:

```bash
PAPERCLIP_AUTH_MODE=apiKey
PAPERCLIP_API_KEY=pcp_sdk_...
```

e o Paperclip deve rejeitar chamadas sem essa chave mesmo com UI desligada.
