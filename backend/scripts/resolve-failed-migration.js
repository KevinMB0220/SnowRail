#!/usr/bin/env node

/**
 * Script to resolve failed Prisma migrations in production
 * This marks failed migrations as rolled back so new migrations can be applied
 * 
 * Usage: node scripts/resolve-failed-migration.js [migration-name]
 * Example: node scripts/resolve-failed-migration.js 20251208224855_init
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const migrationName = process.argv[2] || '20251208224855_init';

console.log('🔄 Resolving failed migration:', migrationName);
console.log('   This will mark the migration as rolled back');
console.log('   New migrations can then be applied\n');

try {
  // Use prisma migrate resolve to mark the failed migration as rolled back
  execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
  });
  
  console.log('\n✅ Migration resolved successfully');
  console.log('   You can now run: npx prisma migrate deploy');
} catch (error) {
  console.error('\n❌ Error resolving migration:', error.message);
  console.error('\nAlternative: You can manually delete the failed migration record');
  console.error('   from the _prisma_migrations table in your database');
  process.exit(1);
}

