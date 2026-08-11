---
name: antigravity-security
description: Checklist e medidas de segurança recomendadas (OWASP ZAP, Gitleaks, OpenGrep, proteção de banco de dados, sanitização de inputs, controle de rotas por UUID e RBAC, gestão de chaves) para aplicação em todo código novo ou existente.
---

# Skill de Segurança Antigravity

## Objetivo
Garantir que todo código novo ou existente seja escrito e mantido de forma segura, seguindo práticas recomendadas de segurança.

---

## Checklist de Segurança

### 1. OWASP ZAP
- Rodar testes automatizados em homologação.
- Configurar scans regulares no CI/CD.
- Corrigir vulnerabilidades antes da produção.

### 2. Gitleaks
- Integrar no CI/CD para bloquear commits com segredos.
- Configurar hooks locais para evitar push de credenciais.
- Usar vaults (Azure Key Vault, HashiCorp Vault) para armazenar segredos.

### 3. OpenGrep
- Criar regras para localizar padrões inseguros.
- Automatizar auditorias periódicas.
- Usar junto com revisões de código.

### 4. Banco sem tranca
- Configurar usuário e senha fortes.
- Usar TLS/SSL nas conexões.
- Criptografar dados sensíveis em repouso.
- Restringir acesso apenas a serviços autorizados.

### 5. Permissão no navegador
- Solicitar apenas quando necessário.
- Usar HTTPS sempre.
- Informar claramente ao usuário o motivo da permissão.
- Revogar permissões não utilizadas.

### 6. Rota entregando dado pelo ID
- Implementar controle de acesso por usuário/role.
- Validar se o usuário tem direito ao recurso.
- Usar UUIDs em vez de IDs sequenciais.

### 7. Chave exposta
- Nunca expor chaves no frontend.
- Usar variáveis de ambiente seguras.
- Rotacionar chaves regularmente.
- Monitorar acessos suspeitos.

### 8. Input sem tratamento (SQL Injection)
- Usar queries parametrizadas (prepared statements).
- Validar e sanitizar entradas.
- Restringir permissões do banco.
- Implementar WAF para bloquear ataques.

---

## Aplicação
- **Antes de escrever código:** passar por cada item da lista.  
- **Ao revisar código existente:** validar se todos os pontos estão aplicados.  
- **No pipeline:** automatizar verificações com ZAP, Gitleaks e OpenGrep.  
