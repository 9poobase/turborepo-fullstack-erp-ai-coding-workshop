import { createPrismaClient, hashPassword, Role } from '../src/index.js';

const prisma = createPrismaClient(
  process.env.DATABASE_URL ?? 'postgresql://erp:erp@localhost:5432/erp',
);

// Demo accounts for the workshop (also shown on the login page). Re-running the seed resets them.
// Roles and stores follow the TOR (Section 2 roles, Section 8.1 starting data).
const demoUsers = [
  { email: 'admin@erp.local', name: 'Admin User', role: Role.ADMIN, storeCode: null },
  { email: 'buyer01@erp.local', name: 'Buyer 01', role: Role.PURCHASING_OFFICER, storeCode: null },
  {
    email: 'staff_b01@erp.local',
    name: 'Store Employee B01',
    role: Role.STORE_EMPLOYEE,
    storeCode: 'B01',
  },
  {
    email: 'staff_b02@erp.local',
    name: 'Store Employee B02',
    role: Role.STORE_EMPLOYEE,
    storeCode: 'B02',
  },
  { email: 'manager01@erp.local', name: 'Manager 01', role: Role.MANAGER, storeCode: null },
];
const DEMO_PASSWORD = 'password';

// Master data from the TOR Section 8.1 starting data.
const demoStores = [
  { code: 'B01', name: 'Central Store' },
  { code: 'B02', name: 'Riverside Store' },
];

const demoSuppliers = [
  { code: 'SUP01', name: 'SupplyOne Co Ltd', contact: 'ฝ่ายขาย, 02-000-0000' },
];

// Every product has a reorder threshold of 3 at B01 (Section 8.1). B02 balances are zero.
const demoProducts = [
  {
    sku: 'SKU001',
    name: 'Drinking water pack of 6',
    category: 'เครื่องดื่ม',
    unit: 'แพ็ค',
    sellingPrice: 60.0,
  },
  {
    sku: 'SKU002',
    name: 'Tissue paper',
    category: 'ของใช้ในบ้าน',
    unit: 'แพ็ค',
    sellingPrice: 35.0,
  },
  {
    sku: 'SKU003',
    name: 'Laundry detergent',
    category: 'ของใช้ในบ้าน',
    unit: 'ถุง',
    sellingPrice: 120.0,
  },
];
const DEMO_THRESHOLD = { storeCode: 'B01', threshold: 3 };

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

  for (const store of demoStores) {
    await prisma.store.upsert({
      where: { code: store.code },
      update: { name: store.name },
      create: store,
    });
  }
  console.log(`Seeded ${demoStores.length} demo stores.`);

  for (const supplier of demoSuppliers) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: { name: supplier.name, contact: supplier.contact },
      create: supplier,
    });
  }
  console.log(`Seeded ${demoSuppliers.length} demo suppliers.`);

  for (const product of demoProducts) {
    // Re-runnable: replace the product's thresholds with the single demo threshold at B01.
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        ...product,
        active: true,
        thresholds: { deleteMany: {}, create: [DEMO_THRESHOLD] },
      },
      create: { ...product, active: true, thresholds: { create: [DEMO_THRESHOLD] } },
    });
  }
  console.log(`Seeded ${demoProducts.length} demo products.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
