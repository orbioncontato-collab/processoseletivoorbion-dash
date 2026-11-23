#!/usr/bin/env bash
# Sobe um Postgres local descartável, aplica a imitação do Supabase e as migrações.
# Uso: scripts/test-db.sh up | down | reset
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA_DIR="${TEST_PG_DATA:-/tmp/head-comercial-pg}"
PORT="${TEST_PG_PORT:-54329}"
DB="head_comercial_test"

as_pg() {
  if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi
}

up() {
  if [ ! -d "$DATA_DIR" ]; then
    mkdir -p "$DATA_DIR"
    [ "$(id -u)" = "0" ] && chown postgres:postgres "$DATA_DIR"
    as_pg "$PGBIN/initdb -D $DATA_DIR -U postgres --auth=trust >/dev/null"
  fi
  if ! as_pg "$PGBIN/pg_ctl -D $DATA_DIR status" >/dev/null 2>&1; then
    as_pg "$PGBIN/pg_ctl -D $DATA_DIR -o '-p $PORT -k /tmp' -l $DATA_DIR/log.txt start -w" >/dev/null
  fi
  reset
}

reset() {
  psql -h 127.0.0.1 -p "$PORT" -U postgres -q -c "drop database if exists $DB" -c "create database $DB"
  # Os papéis são globais no cluster: só cria se ainda não existirem.
  if ! psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "select 1 from pg_roles where rolname='authenticated'" | grep -q 1; then
    psql -h 127.0.0.1 -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/db/supabase-shim.sql"
  else
    sed '/^create role/d; /^grant anon, authenticated/d' "$ROOT/tests/db/supabase-shim.sql" \
      | psql -h 127.0.0.1 -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1 -d "$DB"
  fi
  for f in "$ROOT"/supabase/migrations/*.sql; do
    psql -h 127.0.0.1 -p "$PORT" -U postgres -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
  done
  echo "DATABASE_URL_TEST=postgres://postgres@127.0.0.1:$PORT/$DB"
}

down() {
  as_pg "$PGBIN/pg_ctl -D $DATA_DIR stop -m fast" >/dev/null 2>&1 || true
}

"${1:-up}"
