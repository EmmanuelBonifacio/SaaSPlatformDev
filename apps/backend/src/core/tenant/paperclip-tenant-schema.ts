/**
 * Legado Paperclip (SP-7 cleanup).
 * Provisioner não cria mais estas tabelas.
 * Use `buildDropPaperclipTenantSchemaSQL` apenas via script opt-in.
 */
export function buildDropPaperclipTenantSchemaSQL(
  schemaName: string,
): string[] {
  return [
    `DROP TABLE IF EXISTS "${schemaName}".paperclip_conversations CASCADE`,
    `DROP TABLE IF EXISTS "${schemaName}".paperclip_settings CASCADE`,
  ];
}
