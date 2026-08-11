---
name: security-rules
description: Regras globais de segurança baseadas no checklist Antigravity para aplicação automática em toda geração de código.
always_on: true
---

# Regras de Segurança Antigravity (SaaS Core)

Toda geração ou modificação de código neste repositório DEVE obrigatoriamente cumprir este checklist de segurança:

1. **Gestão de Segredos & Chaves:**
   - NUNCA codificar chaves, senhas ou tokens diretamente no frontend ou código-fonte.
   - Utilizar variáveis de ambiente tipadas e validadas (`config/env.ts`).

2. **Rotas e Acesso por ID (IDOR & RBAC):**
   - Utilizar obrigatoriamente **UUIDs** (não IDs numéricos/sequenciais).
   - Validar autenticação (JWT) e autorização (RBAC por tenant/role) em todos os handlers.

3. **Injeção de SQL e Validação de Inputs:**
   - Usar queries parametrizadas com Prisma (`prisma.$executeRaw\`...\`` ou Prisma Client).
   - Validar todos os payloads de entrada usando schemas Zod (`.parse()`).

4. **Proteção do Banco de Dados & Conexão:**
   - Conexões seguras (SSL/TLS em produção).
   - Armazenar hashes de senha com Bcrypt (mínimo 12 rounds) e tokens de refresh como hash SHA-256.

5. **Permissões do Navegador & HTTPS:**
   - Forçar HTTPS com HSTS (2 anos) em produção.
   - Configurar headers HTTP de segurança (CSP restritivo, X-Frame-Options DENY, noSniff).
