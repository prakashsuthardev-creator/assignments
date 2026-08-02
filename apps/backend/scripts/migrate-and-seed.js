#!/usr/bin/env node

// This script runs database migration and seeds Task 2 allowlist
// Used in Render deployment

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔄 Running database migrations...');

try {
  // Change to backend directory
  const backendDir = resolve(__dirname, '..');
  process.chdir(backendDir);

  // Run Prisma migrate using pnpm exec
  execSync('pnpm exec prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('✅ Database migrations completed');

  // Seed Task 2 allowlist
  console.log('🌱 Seeding Task 2 allowlist...');
  
  // Import and run the seed function
  const { seedAllowlist } = await import('../dist/task2/seed-allowlist.js');
  await seedAllowlist();

  console.log('✅ Task 2 allowlist seeded');
  console.log('🚀 Database setup complete!');

} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}