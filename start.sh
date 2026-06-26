#!/bin/sh
echo "=== WaterMart Starting ==="

# Create DB directory
mkdir -p /app/data

# Run DB migration
cd /app/packages/core
DATABASE_URL="file:/app/data/watermart.db" npx prisma db push --schema=src/database/schema.prisma 2>/dev/null || echo "DB already exists"
DATABASE_URL="file:/app/data/watermart.db" npx tsx src/database/seed.ts 2>/dev/null || echo "Seed skipped"

# Start storefront
cd /app/apps/storefront
DATABASE_URL="file:/app/data/watermart.db" npx next start -p 3456 &

# Start admin
cd /app/apps/admin
DATABASE_URL="file:/app/data/watermart.db" npx next start -p 3457 &

echo "Storefront: http://localhost:3456"
echo "Admin:      http://localhost:3457"

# Wait for any process to exit
wait
