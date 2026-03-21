#!/bin/sh
set -e

echo "==> Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "
    const net = require('net');
    try {
      const dbUrl = process.env.DATABASE_URL.replace('postgresql://', 'http://').replace('postgres://', 'http://');
      const url = new URL(dbUrl);
      const socket = net.createConnection(parseInt(url.port) || 5432, url.hostname);
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); process.exit(0); });
      socket.on('error', () => process.exit(1));
      socket.on('timeout', () => { socket.destroy(); process.exit(1); });
    } catch (e) {
      console.error('URL parse error:', e);
      process.exit(1);
    }
  " 2>/dev/null; then
    echo "==> Database is reachable!"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "==> Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: Database not reachable after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

echo "==> Applying database migrations..."
node node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss || {
  echo "WARNING: Database schema push failed (maybe wait for DB?)."
}

echo "==> Seeding admin user..."
node scripts/seed-admin.mjs || echo "WARNING: Seed script failed (non-fatal)."

echo "==> Starting Next.js server..."
exec node server.js
