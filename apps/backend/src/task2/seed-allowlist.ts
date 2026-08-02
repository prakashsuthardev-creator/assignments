import { getPrismaClient } from '../db.js';
import { allowlist } from './allowlist.js';

export async function seedAllowlist() {
  const prisma = await getPrismaClient();
  
  if (!prisma) {
    console.error('Database connection not available');
    process.exit(1);
  }

  console.log('Seeding Task 2 status allowlist...');

  for (const entry of allowlist) {
    try {
      await (prisma as any).task2StatusAllowlist.upsert({
        where: {
          source_sourceStatus: {
            source: entry.source,
            sourceStatus: entry.sourceStatus,
          },
        },
        update: {
          isCollected: entry.isCollected,
        },
        create: {
          source: entry.source,
          sourceStatus: entry.sourceStatus,
          isCollected: entry.isCollected,
        },
      });
      console.log(`✓ ${entry.source}:${entry.sourceStatus} -> ${entry.isCollected}`);
    } catch (err) {
      console.error(`Failed to seed ${entry.source}:${entry.sourceStatus}:`, err);
    }
  }

  console.log(`\nSeeded ${allowlist.length} allowlist entries`);
  await (prisma as any).$disconnect();
}

// Run directly if called as script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllowlist().catch(console.error);
}
