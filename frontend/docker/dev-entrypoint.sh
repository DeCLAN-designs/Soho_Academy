#!/bin/sh
set -eu

# When /app is bind-mounted, node_modules can be empty on first boot.
# Install dependencies into the mounted volume so Vite always starts.
if [ ! -x /app/node_modules/.bin/vite ]; then
  npm ci
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
