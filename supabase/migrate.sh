#!/bin/bash
# Run all migrations in order against the target database.
# Usage: ./migrate.sh
# Requires: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE env vars
# Or pass connection string: ./migrate.sh "postgresql://user:pass@host:5432/db"

set -e

DIR="$(cd "$(dirname "$0")/migrations" && pwd)"

if [ -n "$1" ]; then
  CONN="$1"
else
  CONN="postgresql://${PGUSER:-postgres}:${PGPASSWORD:-postgres}@${PGHOST:-127.0.0.1}:${PGPORT:-5432}/${PGDATABASE:-postgres}"
fi

echo "Running migrations against: ${PGHOST:-127.0.0.1}:${PGPORT:-5432}/${PGDATABASE:-postgres}"

for f in $(ls "$DIR"/*.sql | sort); do
  echo "  → $(basename $f)"
  psql "$CONN" -f "$f"
done

echo "All migrations applied."
