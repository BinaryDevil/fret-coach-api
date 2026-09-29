#!/usr/bin/env bash
# Copy the Supabase "public" schema + data into an empty Neon database.
# Usage (from the project root):
#   NEON_URL='postgresql://...neon.tech/neondb?sslmode=require' bash scripts/migrate-to-neon.sh
# Use Neon's DIRECT connection string (hostname WITHOUT "-pooler").
set -euo pipefail
cd "$(dirname "$0")/.."

: "${NEON_URL:?Set NEON_URL to the direct Neon connection string, without -pooler}"
if printf '%s' "$NEON_URL" | grep -q -- '-pooler'; then echo "Use the direct Neon URL, without -pooler, for the restore."; exit 1; fi

# Source = the current (Supabase) DATABASE_URL in .env. Run this BEFORE switching .env to Neon.
SRC=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -e 's/^["]//' -e 's/["]$//')
[ -n "$SRC" ] || { echo "DATABASE_URL not found in .env"; exit 1; }
if printf '%s' "$SRC" | grep -q 'neon.tech'; then echo ".env DATABASE_URL already points to Neon; nothing to migrate from."; exit 1; fi

# 1. Postgres client tools (libpq = psql/pg_dump/pg_restore, latest version)
if ! command -v brew >/dev/null; then echo "Homebrew is required: https://brew.sh"; exit 1; fi
brew list libpq >/dev/null 2>&1 || brew install libpq
export PATH="$(brew --prefix libpq)/bin:$PATH"
echo "Using $(pg_dump --version)"

echo "== Source:  $(psql "$SRC" -Atc 'select version()' | cut -d' ' -f1-2)"
echo "== Target:  $(psql "$NEON_URL" -Atc 'select version()' | cut -d' ' -f1-2)"

# 2. Refuse to overwrite a non-empty target
EXISTING=$(psql "$NEON_URL" -Atc "select count(*) from information_schema.tables where table_schema='public'")
if [ "$EXISTING" != "0" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "Neon 'public' schema already has $EXISTING tables. Re-run with FORCE=1 to restore anyway."; exit 1
fi

# 3. Recreate extensions (same schema as on Supabase), skipping Supabase-internal ones
echo "== Extensions"
psql "$SRC" -At -F' ' -c "select e.extname, n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace
  where e.extname not in ('plpgsql','pg_graphql','pg_stat_statements','supabase_vault','pgsodium','pgjwt','pg_net','pg_cron')" |
while read -r ext schema; do
  [ -z "$ext" ] && continue
  echo "  $ext (schema $schema)"
  psql "$NEON_URL" -q -c "create schema if not exists \"$schema\"; create extension if not exists \"$ext\" with schema \"$schema\";" \
    || echo "  ! could not create $ext on Neon (check Neon's supported extensions)"
done

# 4. Dump public schema from Supabase
DUMP="${TMPDIR:-/tmp}/fret-coach-supabase.dump"
EXTRA=""; pg_dump --help | grep -q -- --no-policies && EXTRA="--no-policies"
echo "== Dumping to $DUMP"
pg_dump -Fc --no-owner --no-acl $EXTRA --schema=public "$SRC" -f "$DUMP"

# 5. Restore into Neon (non-fatal warnings are listed at the end)
echo "== Restoring into Neon"
LOG="${TMPDIR:-/tmp}/fret-coach-restore.log"
pg_restore --no-owner --no-acl -d "$NEON_URL" "$DUMP" >"$LOG" 2>&1 || true
if [ -s "$LOG" ]; then echo "  Restore messages (usually harmless role/extension notices):"; sed 's/^/    /' "$LOG" | head -40; fi

# 6. Verify row counts table by table
echo "== Row counts (Supabase vs Neon)"
MISMATCH=0
for t in $(psql "$SRC" -Atc "select tablename from pg_tables where schemaname='public' order by 1"); do
  a=$(psql "$SRC" -Atc "select count(*) from public.\"$t\"")
  b=$(psql "$NEON_URL" -Atc "select count(*) from public.\"$t\"" 2>/dev/null || echo MISSING)
  flag="ok"; [ "$a" = "$b" ] || { flag="MISMATCH"; MISMATCH=1; }
  printf "  %-40s %10s %10s  %s\n" "$t" "$a" "$b" "$flag"
done
rm -f "$DUMP"
[ "$MISMATCH" = "0" ] && echo "== Done: all tables match." || { echo "== Some tables differ, see above."; exit 1; }
