import { createPrismaClient } from '../src/index.js';

const prisma = createPrismaClient(
  process.env.DATABASE_URL ?? 'postgresql://erp:erp@localhost:5432/erp',
);

async function main() {
  // Add seed data here once we have models, e.g.
  // await prisma.customer.upsert({ where: { code: 'C001' }, update: {}, create: { ... } });
  console.log('Nothing to seed yet.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
