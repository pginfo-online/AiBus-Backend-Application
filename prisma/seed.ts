import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Administrative Accounts ---');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@aibus.internal' },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'superadmin@aibus.internal',
      passwordHash,
      firstName: 'Chief',
      lastName: 'SuperAdmin',
      phone: '+919999900001',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Super Admin seeded: ${superAdmin.email} (${superAdmin.role})`);

  // 2. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aibus.internal' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@aibus.internal',
      passwordHash,
      firstName: 'Operations',
      lastName: 'Admin',
      phone: '+919999900002',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Admin seeded: ${admin.email} (${admin.role})`);

  // 3. Support Agent
  const support = await prisma.user.upsert({
    where: { email: 'support@aibus.internal' },
    update: {
      passwordHash,
      role: UserRole.SUPPORT_AGENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'support@aibus.internal',
      passwordHash,
      firstName: 'HelpDesk',
      lastName: 'Agent',
      phone: '+919999900003',
      role: UserRole.SUPPORT_AGENT,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Support Agent seeded: ${support.email} (${support.role})`);

  // 4. Default Global Commission Rule (10% flat percentage)
  const defaultRule = await prisma.commissionRule.findFirst({
    where: { name: 'Default Global Commission' },
  });
  if (!defaultRule) {
    await prisma.commissionRule.create({
      data: {
        name: 'Default Global Commission',
        ruleType: 'FLAT_PERCENTAGE',
        percentage: 10.0,
        priority: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        isActive: true,
        createdBy: superAdmin.id,
      },
    });
    console.log('✓ Default Global Commission Rule seeded (10%)');
  }

  console.log('--- Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
