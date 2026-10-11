require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Administrative Accounts ---');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@aibus.internal' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'superadmin@aibus.internal',
      passwordHash,
      firstName: 'Chief',
      lastName: 'SuperAdmin',
      phone: '+919999900001',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Super Admin:', superAdmin.email, superAdmin.role);

  // 2. Operations Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aibus.internal' },
    update: {
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@aibus.internal',
      passwordHash,
      firstName: 'Operations',
      lastName: 'Admin',
      phone: '+919999900002',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Operations Admin:', admin.email, admin.role);

  // 3. Support Agent
  const support = await prisma.user.upsert({
    where: { email: 'support@aibus.internal' },
    update: {
      passwordHash,
      role: 'SUPPORT_AGENT',
      status: 'ACTIVE',
    },
    create: {
      email: 'support@aibus.internal',
      passwordHash,
      firstName: 'HelpDesk',
      lastName: 'Agent',
      phone: '+919999900003',
      role: 'SUPPORT_AGENT',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Support Agent:', support.email, support.role);

  console.log('--- Completed Successfully ---');
}

main()
  .catch((err) => {
    console.error('Seed Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
