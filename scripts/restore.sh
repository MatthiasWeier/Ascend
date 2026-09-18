#!/usr/bin/env bash
# Restores a database dump (and optionally an uploads archive) made by
# backup.sh. Destructive: wipes the current database before restoring.
#
# Usage: ./scripts/restore.sh backups/db-20260101-030000.sql.gz [backups/uploads-20260101-030000.tar.gz]
set -euo pipefail

cd "$(dirname "$0")/.."

DB_DUMP="${1:?Usage: restore.sh <db-dump.sql.gz> [uploads.tar.gz]}"
UPLOADS_ARCHIVE="${2:-}"

echo "This will REPLACE the current database with $DB_DUMP. Ctrl+C to abort."
read -r -p "Continue? [y/N] " confirm
[ "$confirm" = "y" ] || { echo "Aborted."; exit 1; }

echo "[restore] Recreating database..."
docker compose exec -T db psql -U ascend -d postgres -c "DROP DATABASE IF EXISTS ascend;"
docker compose exec -T db psql -U ascend -d postgres -c "CREATE DATABASE ascend OWNER ascend;"
gunzip -c "$DB_DUMP" | docker compose exec -T db psql -U ascend -d ascend

if [ -n "$UPLOADS_ARCHIVE" ]; then
  echo "[restore] Restoring uploads..."
  docker run --rm \
    -v ascend_uploads-data:/uploads \
    -v "$(pwd)/$(dirname "$UPLOADS_ARCHIVE"):/backup" \
    alpine sh -c "rm -rf /uploads/* && tar xzf /backup/$(basename "$UPLOADS_ARCHIVE") -C /uploads"
fi

echo "[restore] Done. Restart the app: docker compose restart app"
