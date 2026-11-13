---
name: secure-secrets
description: Prevenir exposição e conduzir análise ou rotação controlada de credenciais e chaves.
---

# Gestão segura de segredos

## Classificação

- Busque apenas os locais autorizados e sanitize toda saída. Não exiba valor completo de chave, token, senha ou conteúdo de arquivo de ambiente.
- Classifique cada variável pela capacidade e escopo real, não pelo nome: segredo de servidor, credencial de usuário, chave pública deliberada ou dado não secreto.
- Qualquer variável compilada para cliente (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_` e equivalentes) é pública; segredos nunca pertencem a ela.
- Diferencie presença no repositório, bundle, histórico Git, log, artifact, issue e ambiente externo. Não afirme exposição pública sem evidência.

## Resposta a possível vazamento

1. Não copie nem reutilize o valor.
2. Registre tipo/local/intervalo de exposição de forma sanitizada e avalie alcance e privilégio.
3. Recomende revogação/rotação imediata pelo dono e canal seguro; considere credenciais derivadas, sessões, logs e serviços dependentes.
4. Preserve evidência necessária sem espalhar o segredo. Remoção do histórico não invalida a credencial e requer plano próprio.
5. Não execute rotação, alteração de ambiente ou reescrita de histórico sem autorização explícita.
6. Após rotação autorizada, proponha verificação de uso indevido e testes de que o sistema funciona apenas com credencial nova.

Nunca use serviço de terceiros para escanear código/segredos sem autorização explícita.
