import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create a default company
  const company = await prisma.company.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      name: 'Default Company',
    }
  });

  // Create an admin user to login
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'Admin',
      status: true,
      companyId: 'default-company',
    },
  });

  // Create a mock employee
  const employee1 = await prisma.user.upsert({
    where: { email: 'aarav@epm.com' },
    update: {},
    create: {
      email: 'aarav@epm.com',
      passwordHash: hashedPassword, // In reality, would not have password or different
      name: 'Aarav Sharma',
      role: 'Field Technician',
      status: true,
      companyId: 'default-company',
    },
  });

  // Insert a location for Aarav
  await prisma.locationLog.create({
    data: {
      userId: employee1.id,
      companyId: 'default-company',
      latitude: 19.0760,
      longitude: 72.8777,
      accuracy: 10,
      recordedAt: new Date(),
    }
  });

  console.log('Database seeded! You can login with admin@company.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
