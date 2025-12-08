#!/usr/bin/env node

/**
 * Script to automatically set the correct Prisma provider based on DATABASE_URL
 * Detects SQLite (file:) vs PostgreSQL (postgresql:// or postgres://)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
const migrationLockPath = join(__dirname, '..', 'prisma', 'migrations', 'migration_lock.toml');
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

// Detect provider from DATABASE_URL
// Default to SQLite (local development with file), change to PostgreSQL if postgresql:// is detected
let provider = 'sqlite'; // default (local development)
if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
  provider = 'postgresql'; // production
} else if (databaseUrl.startsWith('file:')) {
  provider = 'sqlite'; // local development
}

// Read current schema
const schemaContent = readFileSync(schemaPath, 'utf-8');

// Extract current provider from schema
const providerMatch = schemaContent.match(/datasource db\s*\{[^}]*provider\s*=\s*"([^"]*)"/s);
const currentProvider = providerMatch ? providerMatch[1] : null;

// Update provider in datasource block if needed
let updatedSchema = schemaContent;
if (currentProvider !== provider) {
  updatedSchema = schemaContent.replace(
    /(datasource db\s*\{[^}]*provider\s*=\s*")[^"]*(")/s,
    `$1${provider}$2`
  );
  
  writeFileSync(schemaPath, updatedSchema, 'utf-8');
  console.log(`✅ Prisma provider changed: ${currentProvider} → ${provider}`);
  console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 60)}${databaseUrl.length > 60 ? '...' : ''}`);
} else {
  console.log(`ℹ️  Prisma provider already set to: ${provider}`);
}

// Update migration_lock.toml if it exists and provider doesn't match
try {
  if (readFileSync(migrationLockPath, 'utf-8')) {
    const lockContent = readFileSync(migrationLockPath, 'utf-8');
    const lockProviderMatch = lockContent.match(/provider\s*=\s*"([^"]*)"/);
    const lockProvider = lockProviderMatch ? lockProviderMatch[1] : null;
    
    if (lockProvider && lockProvider !== provider) {
      const updatedLock = lockContent.replace(
        /provider\s*=\s*"[^"]*"/,
        `provider = "${provider}"`
      );
      writeFileSync(migrationLockPath, updatedLock, 'utf-8');
      console.log(`✅ Migration lock updated: ${lockProvider} → ${provider}`);
    }
  }
} catch (error) {
  // migration_lock.toml doesn't exist yet, that's fine
}

// Convert SQLite migrations to PostgreSQL if needed
if (provider === 'postgresql') {
  const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
  try {
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const migrationName of migrations) {
      const migrationSqlPath = join(migrationsDir, migrationName, 'migration.sql');
      try {
        let migrationSql = readFileSync(migrationSqlPath, 'utf-8');
        let updated = false;
        
        // Convert SQLite-specific types to PostgreSQL
        // DATETIME -> TIMESTAMP
        if (migrationSql.includes('DATETIME')) {
          migrationSql = migrationSql.replace(/DATETIME/g, 'TIMESTAMP');
          updated = true;
        }
        
        // CURRENT_TIMESTAMP is fine for both, but ensure it's compatible
        // SQLite uses CURRENT_TIMESTAMP, PostgreSQL also supports it
        
        if (updated) {
          writeFileSync(migrationSqlPath, migrationSql, 'utf-8');
          console.log(`✅ Converted migration ${migrationName} from SQLite to PostgreSQL`);
        }
      } catch (error) {
        // migration.sql doesn't exist in this migration, skip
      }
    }
  } catch (error) {
    // migrations directory doesn't exist or can't be read, that's fine
  }
}

