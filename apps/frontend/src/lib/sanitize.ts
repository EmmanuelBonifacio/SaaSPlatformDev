// =============================================================================
// lib/sanitize.ts
// Sanitização de HTML para evitar XSS ao renderizar conteúdo de usuário.
// Usa isomorphic-dompurify (funciona em Node SSR e no browser).
//
// REGRA: nunca renderize strings de usuário sem passar por sanitizeHtml().
//        Para texto puro (sem tags), use sanitizeText() que remove todo HTML.
// =============================================================================

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"];
const ALLOWED_ATTR: string[] = []; // nenhum atributo permitido

/**
 * Sanitiza HTML: mantém apenas tags da allowlist, remove scripts e atributos.
 * Use quando precisar renderizar HTML formatado (negrito, listas, etc.).
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: false,
  });
}

/**
 * Remove todo HTML e retorna texto puro.
 * Use para campos onde qualquer tag é indesejada (nomes, emails, slugs, etc.).
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
