#!/bin/sh
set -e

# Run DB migrations if DB env present
if [ -n "$DB_HOST" ]; then
  echo "Running DB migrations..."
  node src/migration/apply_migrations.js || {
    echo "Migrations failed" >&2
    exit 1
  }
fi

# Start the server
exec node server.js
