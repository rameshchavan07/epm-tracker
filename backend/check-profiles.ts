import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.faceProfile.findMany({
    select: {
      userId: true,
      deviceId: true,
      createdAt: true,
    }
  });
  console.log('--- REGISTERED FACE PROFILES ---');
  console.dir(profiles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
