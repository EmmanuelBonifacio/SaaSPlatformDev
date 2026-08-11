#!/usr/bin/env bash
# =============================================================================
# scripts/backup-db.sh
# Backup automático do PostgreSQL com retenção de 30 dias.
#
# Uso: ./scripts/backup-db.sh
# Cron (diário às 02:00): 0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
#
# Variáveis de ambiente necessárias (pode vir do .env ou do sistema):
#   DATABASE_URL  — postgresql://user:pass@host:5432/dbname
#   BACKUP_DIR    — diretório destino (padrão: /backups)
#   RETENTION_DAYS — dias de retenção (padrão: 30)
# =============================================================================

set -euo pipefail

# ─── Configuração ─────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
MIN_SIZE_BYTES=1024  # Rejeita backups menores que 1 KB (dump vazio = erro)

# ─── Parsear DATABASE_URL ─────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL não definida. Abortando."
  exit 1
fi

# Extrai componentes da URL: postgresql://user:pass@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

DB_PORT="${DB_PORT:-5432}"

if [[ -z "$DB_USER" || -z "$DB_HOST" || -z "$DB_NAME" ]]; then
  echo "[ERROR] Não foi possível parsear DATABASE_URL. Verifique o formato."
  exit 1
fi

# ─── Criar diretório de backup ────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ─── Executar dump ────────────────────────────────────────────────────────────
echo "[INFO] Iniciando backup: ${DB_NAME}@${DB_HOST}:${DB_PORT} → ${BACKUP_FILE}"

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-password \
  | gzip -9 > "$BACKUP_FILE"

# ─── Verificar tamanho mínimo ─────────────────────────────────────────────────
ACTUAL_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")

if [[ "$ACTUAL_SIZE" -lt "$MIN_SIZE_BYTES" ]]; then
  echo "[ERROR] Backup suspeito: apenas ${ACTUAL_SIZE} bytes. Removendo arquivo inválido."
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[INFO] Backup concluído: ${BACKUP_FILE} ($(numfmt --to=iec-i --suffix=B "$ACTUAL_SIZE"))"

# ─── Limpar backups antigos ───────────────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "[INFO] Backups removidos (>${RETENTION_DAYS} dias): ${DELETED} arquivo(s)"
fi

# ─── Listar backups existentes ────────────────────────────────────────────────
TOTAL=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
echo "[INFO] Total de backups retidos: ${TOTAL}"
