#!/bin/sh
set -e

echo "========================================"
echo "  WaterMart 启动中..."
echo "========================================"

# 创建数据目录
mkdir -p /app/data

echo "[1/4] 数据库迁移..."
cd /app/packages/core
DATABASE_URL="file:/app/data/watermart.db" npx prisma db push --schema=src/database/schema.prisma --skip-generate 2>/dev/null || echo "  DB already synced"

echo "[2/4] 数据库种子数据..."
DATABASE_URL="file:/app/data/watermart.db" npx tsx src/database/seed.ts 2>/dev/null || echo "  Seed skipped (DB already seeded)"

echo "[3/4] 启动前台 (port 3456)..."
cd /app/apps/storefront
PORT=3456 DATABASE_URL="file:/app/data/watermart.db" npx next start -p 3456 &

sleep 3

echo "[4/4] 启动后台 (port 3457)..."
cd /app/apps/admin
PORT=3457 DATABASE_URL="file:/app/data/watermart.db" npx next start -p 3457 &

sleep 2

echo ""
echo "========================================"
echo "  ✅ WaterMart 启动完成!"
echo "========================================"
echo ""
echo "  前台: http://localhost:3456/en"
echo "  后台: http://localhost:3457/dashboard"
echo ""
echo "========================================"

# 保持容器运行
wait