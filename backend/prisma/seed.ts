import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create or find default Company
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Acme Corp (EPM)',
        subscriptionPlan: 'PRO',
        status: true,
      },
    });
    console.log(`Created company: ${company.name} (${company.id})`);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 2. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@epm.com' },
    update: {},
    create: {
      email: 'admin@epm.com',
      name: 'Admin Manager',
      passwordHash,
      role: 'ADMIN',
      companyId: company.id,
      status: true,
    },
  });
  console.log(`Admin user ready: ${admin.email}`);

  // 3. Create Sample Employees
  const employees = [
    {
      name: 'Aarav Sharma',
      email: 'aarav@epm.com',
      role: 'Field Technician',
      lat: 19.076,
      lng: 72.8777,
      status: true,
    },
    {
      name: 'Priya Patel',
      email: 'priya@epm.com',
      role: 'Delivery Lead',
      lat: 28.7041,
      lng: 77.1025,
      status: true,
    },
    {
      name: 'Rahul Desai',
      email: 'rahul@epm.com',
      role: 'Sales Executive',
      lat: 12.9716,
      lng: 77.5946,
      status: false,
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: { status: emp.status },
      create: {
        email: emp.email,
        name: emp.name,
        passwordHash,
        role: 'EMPLOYEE',
        companyId: company.id,
        status: emp.status,
      },
    });

    // Create a location log for this user
    await prisma.locationLog.create({
      data: {
        userId: user.id,
        companyId: company.id,
        latitude: emp.lat,
        longitude: emp.lng,
        accuracy: 10.0,
        speed: 15.5,
        batteryLevel: Math.floor(Math.random() * 40) + 60,
        activityType: 'IN_VEHICLE',
        recordedAt: new Date(),
      },
    });
    console.log(`Employee ready with location: ${user.name}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
