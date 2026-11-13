---
name: release-deploy
description: Preparar e conduzir release/deploy com aprovação, evidências, controle de migrations e rollback.
---

# Release e deploy

## Antes de planejar

1. Leia `CLAUDE.md`, `deploy.sh`, `docker-compose*.yml`, scripts relevantes e a configuração real do ambiente.
2. Confirme explicitamente alvo, branch/commit, serviços, domínio, método de deploy, banco e responsável. Este repo contém instruções Docker e um `deploy.sh` PM2/Hostinger; não presuma que são intercambiáveis.
3. Inspecione scripts antes de executá-los. Nunca use produção como alvo implícito.
4. Apresente plano com diff/versão, build/testes, security checks, backup/restore, migrations, sequência, health checks, janela de impacto, rollback e aprovadores.
5. Aguarde aprovação explícita antes de deploy, migration ou operação produtiva.

## Gate de segurança

- Execute comandos existentes e registre resultado, sem declarar scanners ausentes como aprovados.
- Não prossiga com falha de build/teste, segredos expostos ou vulnerabilidade crítica/alta sem decisão formal e exceção documentada.
- Confirme compatibilidade e reversibilidade de migrations. Backup só é válido quando a capacidade de restauração e os parâmetros RPO/RTO são conhecidos.
- `|| true`, ignorar erro ou health check superficial não comprova migration/deploy bem-sucedido. Pare em erro e reporte estado parcial.
- Nunca inclua segredos em comandos, logs públicos ou relatórios; cuidado com argumentos de processo e shell history.

## Execução e verificação

- Siga apenas a sequência aprovada. Registre commit, horário, operador, etapas e resultados.
- Confirme health checks e comportamento crítico sem expor dados reais; acompanhe logs com redação.
- Em falha, não improvisar rollback destrutivo. Use o plano aprovado e peça autorização se a ação/impacto não estiver coberto.
- Informe claramente sucesso, falha ou estado parcial, riscos residuais e próximos passos.
