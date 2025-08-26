// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'info@pacelab.in';
  const password = 'password123@';

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {}, // no-op if exists
    create: {
      email,
      password: hashed,
      role: 'ADMIN',
      status: 'ACTIVE',
      name: 'Pacelab Admin',
    },
  });

  console.log('✅ Seeded admin:', email);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

