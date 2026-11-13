---
name: server-operations
description: Planejar e operar configuração segura de servidor, rede, banco, proxy, backups e processos.
---

# Configuração segura de servidor

## Procedimento

1. Confirme servidor/ambiente/conta, ownership, autorização e escopo. Não assuma que é produção ou homologação.
2. Faça inventário read-only de sistema operacional, rede, serviços, proxy, runtime, banco, identidade de processos, firewall, TLS, logs e backups necessários.
3. Não revele credenciais, chaves privadas, IPs/hosts sensíveis ou dumps em saída desnecessária.
4. Proponha mudanças de privilégio mínimo: contas sem root para serviço, portas e origens mínimas, SSH restrito, segredos fora do repositório, TLS validado e atualização controlada.
5. Considere segregação de rede, exposição de serviços de banco/admin, limites de recursos, rotação de logs, monitoramento, restauração de backup e resposta a incidente.
6. Identifique risco de indisponibilidade, lockout, migração de dados e rollback. Forneça comandos somente depois de explicar efeito, pré-requisitos e alvo.
7. Aguarde aprovação explícita antes de executar mudanças no servidor, firewall, DNS, certificado, banco, credenciais ou serviço.
8. Valide de forma não destrutiva e registre configuração final sem segredos.

## TLS e deploys existentes

- Preserve validação de certificados. Não use `rejectUnauthorized: false` como workaround.
- Diferencie os fluxos Docker e Hostinger/PM2 documentados. Antes de recomendar execução de `deploy.sh`, revise suas ações de banco, backup e tratamento de erros.
- Não execute scan ativo, benchmark ou teste de carga contra sistema sem autorização e janela definida.

Entregue inventário sanitizado, plano, risco, dependências, comandos aprovados, validações e rollback.
