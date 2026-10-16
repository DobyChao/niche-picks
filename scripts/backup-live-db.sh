#!/bin/bash
# 在线备份线上库。不停止服务。备份目录不在部署目录里。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${XIAOZHONG_DB_PATH:-${HOME}/xiaozhong-data/xiaozhong.db}"
BACKUP_DIR="${HOME}/xiaozhong-backups"
KEEP=30

if [[ ! -f "${DB_PATH}" ]]; then
  echo "找不到线上数据库: ${DB_PATH}" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
stamp="$(date +%Y%m%d-%H%M%S)"
backup="${BACKUP_DIR}/xiaozhong-${stamp}.db"
node "${ROOT}/scripts/db-maint.mjs" backup "${DB_PATH}" "${backup}"
shops="$(node "${ROOT}/scripts/db-maint.mjs" count "${backup}")"

mapfile -t old_backups < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'xiaozhong-*.db' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
if ((${#old_backups[@]} > KEEP)); then
  for old in "${old_backups[@]:KEEP}"; do
    rm -f -- "${old}" "${old}-wal" "${old}-shm"
  done
fi
find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name 'xiaozhong-*.db-wal' -o -name 'xiaozhong-*.db-shm' \) -delete

echo "已备份 ${backup}（店铺 ${shops} 家）" >&2
echo "${backup}"
