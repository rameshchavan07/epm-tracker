import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with HRMS Web Users and Employee Profiles...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create Web Admin User
  const admin = await prisma.webUser.upsert({
    where: { email: 'admin@epm.com' },
    update: {},
    create: {
      email: 'admin@epm.com',
      name: 'Admin Manager',
      passwordHash,
      role: 'ADMIN',
      status: true,
    },
  });
  console.log(`Web Admin user ready: ${admin.email}`);

  // 2. Create default system_setup_table
  const setup = await prisma.system_setup_table.findFirst();
  if (!setup) {
    await prisma.system_setup_table.create({
      data: {
        unique_id_no: 'EMPID|EMP||1',
        status: 'A',
        tracking_interval_minutes: 2,
        face_verification_interval_minutes: 120,
        face_verification_grace_period_minutes: 5,
      },
    });
  }

  // 3. Create Sample HRMS Employees in employees_master
  const employees = [
    { employee_code: 'EMP001', full_name: 'Himanshu Dubey' },
    { employee_code: 'EMP002', full_name: 'Rahul Sharma' },
    { employee_code: 'EMP003', full_name: 'Priya Verma' },
  ];

  for (const emp of employees) {
    await prisma.employees_master.upsert({
      where: { employee_code: emp.employee_code },
      update: { full_name: emp.full_name },
      create: {
        employee_code: emp.employee_code,
        full_name: emp.full_name,
      },
    });
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
