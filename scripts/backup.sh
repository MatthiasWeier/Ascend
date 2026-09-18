#!/usr/bin/env bash
# Dumps the Postgres database and tars up the uploads volume into
# ./backups/. Run from the same directory as docker-compose.yml.
#
# Usage: ./scripts/backup.sh
# Cron example (daily at 3am, keep the repo checked out at /opt/ascend):
#   0 3 * * * cd /opt/ascend && ./scripts/backup.sh >> /var/log/ascend-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p backups
STAMP=$(date -u +%Y%m%d-%H%M%S)

echo "[backup] Dumping database..."
docker compose exec -T db pg_dump -U ascend ascend | gzip > "backups/db-${STAMP}.sql.gz"

echo "[backup] Archiving uploads..."
docker run --rm \
  -v ascend_uploads-data:/uploads:ro \
  -v "$(pwd)/backups:/backup" \
  alpine tar czf "/backup/uploads-${STAMP}.tar.gz" -C /uploads .

echo "[backup] Done: backups/db-${STAMP}.sql.gz, backups/uploads-${STAMP}.tar.gz"
