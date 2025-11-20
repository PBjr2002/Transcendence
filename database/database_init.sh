#!/bin/sh

set -eu pipefail

DB_PATH="/SQLite_data/database.db"
TABLES="./tables.sql"

mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" < "$TABLES"
fi

exec sqlite3 "$DB_PATH"
