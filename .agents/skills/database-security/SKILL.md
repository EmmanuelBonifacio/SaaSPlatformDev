---
name: database-security
description: Revisar ou alterar segurança, privilégios, isolamento, migrations, dados e backups de banco.
---

# Segurança de banco de dados

## Procedimento

1. Confirme ambiente, schema (`public` ou `tenant_<slug>`), identidade de conexão e autorização. Nunca use produção em testes.
2. Identifique tabelas/colunas, classificação dos dados, papéis, caminhos de acesso e mecanismo real de isolamento.
3. Preserve a regra do projeto: consultas de tenant por `withTenantSchema()` e dados globais pelo client público documentado.
4. Verifique menor privilégio, SQL parametrizado, seleção mínima de campos, autorização no service, exposição de dados e logs.
5. Antes de constraints/migrations, examine compatibilidade, dados existentes, duplicidades, lock/tempo de execução, rollback e estratégia para todos os schemas de tenant.
6. Apresente migration e plano de dados para revisão; não rode nem apague/transforme dados sem aprovação.
7. Se RLS existir, documente policies e teste com papéis reais em banco isolado. Não invente policy baseada em Supabase ou `auth.uid()` sem confirmar o modelo.
8. Trate backups como sensíveis, restrinja acesso, defina retenção e prove restauração em ambiente isolado conforme plano aprovado.

Reporte impacto, escopo, validação, risco de indisponibilidade, recuperação e limitações. Nunca cole dump, senha ou dado pessoal em saída.
