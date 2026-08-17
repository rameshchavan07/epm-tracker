import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.faceProfile.findMany({
    select: {
      employee_code: true,
      device_id: true,
      registered_date_time: true,
      login_status: true,
    }
  });
  console.log('--- REGISTERED FACE PROFILES ---');
  console.dir(profiles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
