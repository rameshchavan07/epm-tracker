import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Web Users and Mobile Devices...');

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

  // 1.5 Create default SystemConfig
  const config = await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      trackingIntervalMinutes: 2,
      faceVerificationIntervalMinutes: 120,
      faceVerificationGracePeriodMinutes: 5,
    },
  });
  console.log(`Default SystemConfig ready: tracking=${config.trackingIntervalMinutes}m, face=${config.faceVerificationIntervalMinutes}m`);

  // 2. Create Sample Mobile Users (Devices tracking without login)
  const mobileDevices = [
    {
      deviceId: 'device-android-001',
      userId: 'USR-1001',
      lat: 19.076,
      lng: 72.8777,
      status: true,
    },
    {
      deviceId: 'device-android-002',
      userId: 'USR-1002',
      lat: 28.7041,
      lng: 77.1025,
      status: true,
    },
    {
      deviceId: 'device-android-003',
      userId: 'USR-1003',
      lat: 12.9716,
      lng: 77.5946,
      status: false,
    },
  ];

  for (const dev of mobileDevices) {
    const mobileUser = await prisma.mobileUser.upsert({
      where: { deviceId: dev.deviceId },
      update: {
        userId: dev.userId,
        status: dev.status,
      },
      create: {
        deviceId: dev.deviceId,
        userId: dev.userId,
        status: dev.status,
      },
    });

    await prisma.locationLog.create({
      data: {
        deviceId: dev.deviceId,
        latitude: dev.lat,
        longitude: dev.lng,
        accuracy: 10.0,
        recordedAt: new Date(),
      },
    });

    console.log(
      `Mobile device ready: ${mobileUser.userId} (${mobileUser.deviceId})`,
    );
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
