#!/bin/bash
set -e

echo "🔍 Debugging deployment paths..."
echo "📂 PWD: $(pwd)"
echo "📂 SCRIPT location: ${BASH_SOURCE[0]}"

# Try multiple possible locations (order matters - try most likely first)
POSSIBLE_PATHS=(
  "$(pwd)/dist/server.js"  # Correct location after tsconfig fix
  "$(pwd)/dist/src/server.js"  # Fallback for old structure
  "/opt/render/project/src/backend/dist/server.js"
  "/opt/render/project/src/backend/dist/src/server.js"
  "/opt/render/project/backend/dist/server.js"
  "$(dirname "${BASH_SOURCE[0]}")/dist/server.js"
  "$(dirname "${BASH_SOURCE[0]}")/dist/src/server.js"
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
  # Find backend directory and setup Prisma provider
  echo "🔄 Setting up Prisma provider..."
  BACKEND_DIR=""
  if [ -f "scripts/setup-prisma-provider.js" ]; then
    BACKEND_DIR="$(pwd)"
  elif [ -f "../scripts/setup-prisma-provider.js" ]; then
    BACKEND_DIR="$(cd .. && pwd)"
  elif [ -f "../../scripts/setup-prisma-provider.js" ]; then
    BACKEND_DIR="$(cd ../.. && pwd)"
  fi
  
  if [ -n "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR" && node scripts/setup-prisma-provider.js && cd "$SERVER_DIR"
  else
    echo "⚠️  WARNING: Could not find setup-prisma-provider.js, skipping provider setup"
  fi
  
  echo "🔄 Running Prisma migrations..."
  # Find prisma directory (could be in parent or current)
  PRISMA_DIR=""
  if [ -f "prisma/schema.prisma" ]; then
    PRISMA_DIR="$(pwd)"
  elif [ -f "../prisma/schema.prisma" ]; then
    PRISMA_DIR="$(cd .. && pwd)"
  elif [ -f "../../prisma/schema.prisma" ]; then
    PRISMA_DIR="$(cd ../.. && pwd)"
  fi
  
  if [ -n "$PRISMA_DIR" ]; then
    cd "$PRISMA_DIR"
    # Deploy migrations (clean start - no failed migrations to resolve)
    if npx prisma migrate deploy; then
      echo "✅ Migrations applied successfully"
    else
      echo "⚠️  Migration deploy failed"
      echo "   If you need to reset the database, run: node scripts/reset-database.js"
      echo "   WARNING: This will delete all data!"
    fi
    cd "$SERVER_DIR"
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
