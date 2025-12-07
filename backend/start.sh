#!/bin/bash
set -e

echo "🔍 Debugging deployment paths..."
echo "📂 PWD: $(pwd)"
echo "📂 SCRIPT location: ${BASH_SOURCE[0]}"

# Try multiple possible locations
POSSIBLE_PATHS=(
  "$(pwd)/backend/dist/server.js"
  "$(pwd)/dist/server.js"
  "/opt/render/project/backend/dist/server.js"
  "/opt/render/project/src/backend/dist/server.js"
  "$(dirname "${BASH_SOURCE[0]}")/dist/server.js"
)

SERVER_PATH=""
for path in "${POSSIBLE_PATHS[@]}"; do
  if [ -f "$path" ]; then
    SERVER_PATH="$path"
    echo "✅ Found server at: $path"
    break
  fi
done

if [ -z "$SERVER_PATH" ]; then
  echo "❌ ERROR: dist/server.js not found in any expected location"
  echo ""
  echo "🔍 Searching for server.js..."
  find /opt/render/project -name "server.js" -type f 2>/dev/null | head -10
  echo ""
  echo "📋 Current directory structure:"
  ls -la
  echo ""
  echo "📋 Parent directory:"
  ls -la .. 2>/dev/null || true
  echo ""
  echo "📋 Root project:"
  ls -la /opt/render/project 2>/dev/null || true
  exit 1
fi

# Navigate to the directory containing server.js
SERVER_DIR="$(dirname "$SERVER_PATH")"
cd "$SERVER_DIR" || exit 1
echo "📂 Changed to: $(pwd)"

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "🔄 Running Prisma migrations..."
  # Find prisma directory (could be in parent or current)
  if [ -f "prisma/schema.prisma" ]; then
    npx prisma migrate deploy
  elif [ -f "../prisma/schema.prisma" ]; then
    cd .. && npx prisma migrate deploy && cd "$SERVER_DIR"
  elif [ -f "../../prisma/schema.prisma" ]; then
    cd ../.. && npx prisma migrate deploy && cd "$SERVER_DIR"
  else
    echo "⚠️  WARNING: Could not find prisma/schema.prisma, skipping migrations"
  fi
  echo "✅ Migrations complete"
else
  echo "⚠️  WARNING: DATABASE_URL not set, skipping migrations"
fi

# Start server
echo "🚀 Starting server from: $SERVER_PATH"
exec node --max-old-space-size=512 "$SERVER_PATH"

