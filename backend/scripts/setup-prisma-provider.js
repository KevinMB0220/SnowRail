#!/usr/bin/env node

/**
 * Script to verify Prisma is configured for PostgreSQL
 * SnowRail now uses PostgreSQL exclusively (development and production)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
const databaseUrl = process.env.DATABASE_URL;

// Verify DATABASE_URL is PostgreSQL
if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL is not set');
  console.error('   Please set DATABASE_URL to a PostgreSQL connection string');
  console.error('   Example: postgresql://user:password@localhost:5432/snowrail');
  process.exit(1);
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string');
  console.error(`   Current DATABASE_URL: ${databaseUrl.substring(0, 60)}...`);
  console.error('   PostgreSQL connection strings must start with postgresql:// or postgres://');
  process.exit(1);
}

// Verify schema.prisma is set to PostgreSQL
try {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const providerMatch = schemaContent.match(/datasource db\s*\{[^}]*provider\s*=\s*"([^"]*)"/s);
  const currentProvider = providerMatch ? providerMatch[1] : null;
  
  if (currentProvider !== 'postgresql') {
    console.error(`❌ ERROR: schema.prisma provider is "${currentProvider}", expected "postgresql"`);
    console.error('   Please update prisma/schema.prisma to use provider = "postgresql"');
    process.exit(1);
  }
  
  console.log('✅ Prisma configured for PostgreSQL');
  console.log(`   DATABASE_URL: ${databaseUrl.substring(0, 60)}${databaseUrl.length > 60 ? '...' : ''}`);
} catch (error) {
  console.error('❌ ERROR: Could not read schema.prisma:', error.message);
  process.exit(1);
}

