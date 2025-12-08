#!/usr/bin/env node

/**
 * Script to reset the database and apply migrations from scratch
 * WARNING: This will delete all data in the database!
 * 
 * Usage: node scripts/reset-database.js
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL is not set');
  process.exit(1);
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string');
  process.exit(1);
}

console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
console.log(`   Database: ${databaseUrl.substring(0, 60)}...`);
console.log('');
console.log('🔄 Resetting database...');

try {
  // Reset the database (drops all tables and data)
  console.log('   Dropping all tables...');
  execSync('npx prisma migrate reset --force --skip-seed', {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
  
  console.log('');
  console.log('✅ Database reset complete');
  console.log('   All tables and data have been removed');
  console.log('');
  console.log('🔄 Applying migrations from scratch...');
  
  // Apply migrations
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
  
  console.log('');
  console.log('✅ Database reset and migrations applied successfully!');
  console.log('   Your database is now clean and ready to use');
} catch (error) {
  console.error('');
  console.error('❌ Error resetting database:', error.message);
  process.exit(1);
}

