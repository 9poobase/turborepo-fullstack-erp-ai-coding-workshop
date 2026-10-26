import { createPrismaClient, hashPassword, Role } from '../src/index.js';

const prisma = createPrismaClient(
  process.env.DATABASE_URL ?? 'postgresql://erp:erp@localhost:5432/erp',
);

// Demo accounts for the workshop (also shown on the login page). Re-running the seed resets them.
// Roles and stores follow the TOR (Section 2 roles, Section 8.1 starting data).
const demoUsers = [
  { email: 'admin@erp.local', name: 'Admin User', role: Role.ADMIN, storeCode: null },
  { email: 'buyer01@erp.local', name: 'Buyer 01', role: Role.PURCHASING_OFFICER, storeCode: null },
  { email: 'staff_b01@erp.local', name: 'Store Employee B01', role: Role.STORE_EMPLOYEE, storeCode: 'B01' },
  { email: 'staff_b02@erp.local', name: 'Store Employee B02', role: Role.STORE_EMPLOYEE, storeCode: 'B02' },
  { email: 'manager01@erp.local', name: 'Manager 01', role: Role.MANAGER, storeCode: null },
];
const DEMO_PASSWORD = 'password';

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, storeCode: user.storeCode, passwordHash },
      create: { ...user, passwordHash },
    });
  }
  console.log(`Seeded ${demoUsers.length} demo users (password: "${DEMO_PASSWORD}").`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
