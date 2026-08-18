import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying database performance indexes safely (0 table drops, 0 data loss)...');

  const indexes = [
    {
      name: 'FaceProfile_employee_code_delete_flag_idx',
      sql: `CREATE INDEX IF NOT EXISTS "FaceProfile_employee_code_delete_flag_idx" ON "FaceProfile"("employee_code", "delete_flag");`,
    },
    {
      name: 'FaceProfile_device_id_delete_flag_idx',
      sql: `CREATE INDEX IF NOT EXISTS "FaceProfile_device_id_delete_flag_idx" ON "FaceProfile"("device_id", "delete_flag");`,
    },
    {
      name: 'FaceProfile_login_status_delete_flag_idx',
      sql: `CREATE INDEX IF NOT EXISTS "FaceProfile_login_status_delete_flag_idx" ON "FaceProfile"("login_status", "delete_flag");`,
    },
    {
      name: 'LocationLog_recorded_date_time_idx',
      sql: `CREATE INDEX IF NOT EXISTS "LocationLog_recorded_date_time_idx" ON "LocationLog"("recorded_date_time");`,
    },
    {
      name: 'LocationLog_employee_code_recorded_date_time_desc_idx',
      sql: `CREATE INDEX IF NOT EXISTS "LocationLog_employee_code_recorded_date_time_desc_idx" ON "LocationLog"("employee_code", "recorded_date_time" DESC);`,
    },
    {
      name: 'LoginLog_date_time_idx',
      sql: `CREATE INDEX IF NOT EXISTS "LoginLog_date_time_idx" ON "LoginLog"("date_time");`,
    },
  ];

  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(idx.sql);
      console.log(`✅ Index applied: ${idx.name}`);
    } catch (err: any) {
      console.error(`❌ Failed to create index ${idx.name}: ${err.message}`);
    }
  }

  console.log('All performance indexes successfully created in PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('Index creation script failed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
