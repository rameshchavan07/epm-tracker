import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';
import { TrackingGateway } from './tracking.gateway';
import { LocationLog } from '@prisma/client';

export interface LocationHistoryItem {
  id: string; // Composite key string (employee_code + recorded_date_time)
  employee_code: string;
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
  recorded_date_time: Date;
}

export interface LatestLocationItem {
  id: string;
  employee_code: string;
  name: string;
  status: string;
  lat: number | null;
  lng: number | null;
  address: string;
  battery: number;
  recorded_date_time: Date | null;
}

export interface AnalyticsResult {
  activeUsers: number;
  offlineUsers: number;
  totalUsers: number;
  totalLogsToday: number;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async getTrackingConfig() {
    let setup = await this.prisma.system_setup_table.findFirst();
    if (!setup) {
      setup = await this.prisma.system_setup_table.create({
        data: {
          unique_id_no: 'EMPID|EMP||1',
          status: 'A',
          tracking_interval_minutes: 2,
          face_verification_interval_minutes: 120,
          face_verification_grace_period_minutes: 5,
        },
      });
    }
    const trackingMins = setup.tracking_interval_minutes ?? 2;
    const faceMins = setup.face_verification_interval_minutes ?? 120;
    const graceMins = setup.face_verification_grace_period_minutes ?? 5;

    return {
      trackingIntervalMinutes: trackingMins,
      trackingIntervalMs: trackingMins * 60 * 1000,
      faceVerificationIntervalMinutes: faceMins,
      faceVerificationIntervalMs: faceMins * 60 * 1000,
      faceVerificationGracePeriodMinutes: graceMins,
      faceVerificationGracePeriodMs: graceMins * 60 * 1000,
    };
  }

  async updateTrackingConfig(minutes: number, faceIntervalMinutes?: number, gracePeriodMinutes?: number) {
    const validMinutes = Math.max(1, Math.min(60, minutes));
    const faceInterval = faceIntervalMinutes && faceIntervalMinutes > 0 ? faceIntervalMinutes : 120;
    const gracePeriod = gracePeriodMinutes && gracePeriodMinutes > 0 ? gracePeriodMinutes : 5;

    const setup = await this.prisma.system_setup_table.findFirst();
    if (setup) {
      await this.prisma.system_setup_table.update({
        where: { unique_id_no: setup.unique_id_no },
        data: {
          tracking_interval_minutes: validMinutes,
          face_verification_interval_minutes: faceInterval,
          face_verification_grace_period_minutes: gracePeriod,
          last_changed_time: new Date(),
        },
      });
    } else {
      await this.prisma.system_setup_table.create({
        data: {
          unique_id_no: 'EMPID|EMP||1',
          status: 'A',
          tracking_interval_minutes: validMinutes,
          face_verification_interval_minutes: faceInterval,
          face_verification_grace_period_minutes: gracePeriod,
          created_datetime: new Date(),
          last_changed_time: new Date(),
        },
      });
    }

    this.logger.log(
      `Updated system config: tracking=${validMinutes}m, face=${faceInterval}m, grace=${gracePeriod}m`,
    );

    return this.getTrackingConfig();
  }

  private async reverseGeocodeOSM(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { 'User-Agent': 'EPM-Tracker/1.0' },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (response.ok) {
        const data = (await response.json()) as { display_name?: string };
        return data.display_name || null;
      }
    } catch (error) {
      this.logger.warn(`Reverse geocode failed for (${lat}, ${lng}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return null;
  }

  async processBatch(locations: CreateLocationLogDto[]) {
    if (!locations || locations.length === 0) {
      return { success: true, count: 0 };
    }

    // Limit batch size to prevent memory exhaustion
    const MAX_BATCH_SIZE = 500;
    const batch = locations.slice(0, MAX_BATCH_SIZE);
    if (locations.length > MAX_BATCH_SIZE) {
      this.logger.warn(`Batch size ${locations.length} exceeds limit ${MAX_BATCH_SIZE}, truncating`);
    }

    let processedCount = 0;

    for (const loc of batch) {
      try {
        const recordedDateTime = loc.timestamp ? new Date(loc.timestamp) : new Date();
        const empCode = loc.employeeCode || loc.employee_code || loc.mobileUserId || 'EMP001';

        let address = loc.address || '';
        if (!address && loc.latitude && loc.longitude) {
          const fetched = await this.reverseGeocodeOSM(loc.latitude, loc.longitude);
          if (fetched) address = fetched;
        }

        // Ensure employees_master record exists
        let empMaster = await this.prisma.employees_master.findUnique({
          where: { employee_code: empCode },
        });

        if (!empMaster) {
          try {
            empMaster = await this.prisma.employees_master.create({
              data: {
                employee_code: empCode,
                full_name: `Employee ${empCode}`,
              },
            });
          } catch {
            // Ignore if concurrency constraint
          }
        }

        // 1. Update FaceProfile login_status = 'Y' if profile exists
        await this.prisma.faceProfile.updateMany({
          where: { employee_code: empCode },
          data: {
            login_status: 'Y',
            last_login_date_time: recordedDateTime,
            last_changed_date_time: new Date(),
          },
        });

        // 2. Insert LocationLog record with primary key (employee_code, recorded_date_time)
        await this.prisma.locationLog.upsert({
          where: {
            employee_code_recorded_date_time: {
              employee_code: empCode,
              recorded_date_time: recordedDateTime,
            },
          },
          update: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy ?? 0,
            address: address || '',
          },
          create: {
            employee_code: empCode,
            latitude: loc.latitude,
            longitude: loc.longitude,
            recorded_date_time: recordedDateTime,
            accuracy: loc.accuracy ?? 0,
            address: address || '',
          },
        });

        processedCount++;

        // 3. Broadcast WebSocket update to web dashboard using recorded_date_time
        const empName = empMaster?.full_name || `Employee ${empCode}`;
        this.trackingGateway.broadcastLocationUpdate({
          id: empCode,
          deviceId: empCode,
          employee_code: empCode,
          name: empName,
          status: 'Active',
          lat: loc.latitude,
          lng: loc.longitude,
          address: address || '',
          battery: 100,
          recorded_date_time: recordedDateTime,
        });
      } catch (error) {
        this.logger.error(`Error processing location log:`, error);
      }
    }

    return {
      success: processedCount > 0 || locations.length === 0,
      count: processedCount,
    };
  }

  async processSingle(location: CreateLocationLogDto) {
    return await this.processBatch([location]);
  }

  async getLocationHistory(
    identifier: string,
    limit = 100,
    date?: string,
  ): Promise<LocationHistoryItem[]> {
    const dateFilter = date
      ? {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        }
      : undefined;

    const logs: LocationLog[] = await this.prisma.locationLog.findMany({
      where: {
        employee_code: identifier,
        ...(dateFilter ? { recorded_date_time: dateFilter } : {}),
      },
      orderBy: { recorded_date_time: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: `${log.employee_code}_${log.recorded_date_time.getTime()}`,
      employee_code: log.employee_code,
      lat: log.latitude,
      lng: log.longitude,
      accuracy: log.accuracy,
      address: log.address,
      recorded_date_time: log.recorded_date_time,
    }));
  }

  /**
   * Optimized: uses raw SQL to get latest location per employee in a single query,
   * eliminating the N+1 query problem.
   */
  async getLatestLocations(): Promise<LatestLocationItem[]> {
    const profiles = await this.prisma.faceProfile.findMany({
      where: { delete_flag: 'N' },
    });

    if (profiles.length === 0) return [];

    const employeeCodes = profiles.map((p) => p.employee_code);

    // Fetch employees_master in one query
    const employeesMaster = await this.prisma.employees_master.findMany({
      where: { employee_code: { in: employeeCodes } },
    });
    const masterMap = new Map<string, string>();
    for (const emp of employeesMaster) {
      if (emp.full_name) {
        masterMap.set(emp.employee_code, emp.full_name);
      }
    }

    // Fetch latest location per employee using DISTINCT ON (single query, no N+1)
    const latestLogs = await this.prisma.$queryRaw<
      Array<{
        employee_code: string;
        latitude: number;
        longitude: number;
        address: string;
        recorded_date_time: Date;
      }>
    >`
      SELECT DISTINCT ON (employee_code)
        employee_code, latitude, longitude, address, recorded_date_time
      FROM "LocationLog"
      WHERE employee_code = ANY(${employeeCodes})
      ORDER BY employee_code, recorded_date_time DESC
    `;

    const logMap = new Map<string, (typeof latestLogs)[0]>();
    for (const log of latestLogs) {
      logMap.set(log.employee_code, log);
    }

    const latestLocations: LatestLocationItem[] = [];
    for (const profile of profiles) {
      const latestLog = logMap.get(profile.employee_code);
      if (latestLog) {
        const empName = masterMap.get(profile.employee_code) || `Employee ${profile.employee_code}`;
        latestLocations.push({
          id: profile.employee_code,
          employee_code: profile.employee_code,
          name: empName,
          status: profile.login_status === 'Y' ? 'Active' : 'Offline',
          lat: latestLog.latitude,
          lng: latestLog.longitude,
          address: latestLog.address,
          battery: 90,
          recorded_date_time: latestLog.recorded_date_time,
        });
      }
    }

    return latestLocations;
  }

  async getAnalytics(): Promise<AnalyticsResult> {
    const [activeCount, offlineCount, totalCount, totalLogsToday] =
      await Promise.all([
        this.prisma.faceProfile.count({
          where: { login_status: 'Y', delete_flag: 'N' },
        }),
        this.prisma.faceProfile.count({
          where: { login_status: 'N', delete_flag: 'N' },
        }),
        this.prisma.faceProfile.count({
          where: { delete_flag: 'N' },
        }),
        this.prisma.locationLog.count({
          where: {
            recorded_date_time: {
              gte: (() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
            },
          },
        }),
      ]);

    return {
      activeUsers: activeCount,
      offlineUsers: offlineCount,
      totalUsers: totalCount,
      totalLogsToday,
    };
  }

  /**
   * Optimized: marks stale employees offline using a single raw query
   * instead of N+1 queries per active profile.
   */
  @Cron('0 */1 * * * *')
  async markOfflineUsers(): Promise<void> {
    const config = await this.getTrackingConfig();
    const staleMinutes = Math.max(3, Math.ceil(config.trackingIntervalMinutes * 1.5));
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

    const activeProfiles = await this.prisma.faceProfile.findMany({
      where: { login_status: 'Y', delete_flag: 'N' },
      select: { employee_code: true },
    });

    if (activeProfiles.length === 0) return;

    const activeCodes = activeProfiles.map((p) => p.employee_code);

    // Single query: find latest log per active employee
    const latestLogs = await this.prisma.$queryRaw<
      Array<{ employee_code: string; max_time: Date }>
    >`
      SELECT employee_code, MAX(recorded_date_time) as max_time
      FROM "LocationLog"
      WHERE employee_code = ANY(${activeCodes})
      GROUP BY employee_code
    `;

    const latestMap = new Map<string, Date>();
    for (const row of latestLogs) {
      latestMap.set(row.employee_code, row.max_time);
    }

    const staleCodes: string[] = [];
    for (const code of activeCodes) {
      const lastTime = latestMap.get(code);
      if (!lastTime || lastTime < staleCutoff) {
        staleCodes.push(code);
      }
    }

    if (staleCodes.length === 0) return;

    await this.prisma.faceProfile.updateMany({
      where: { employee_code: { in: staleCodes } },
      data: { login_status: 'N', last_changed_date_time: new Date() },
    });

    this.logger.log(`Marked ${staleCodes.length} employee(s) offline: ${staleCodes.join(', ')}`);

    const masterMap = new Map<string, string>();
    const masters = await this.prisma.employees_master.findMany({
      where: { employee_code: { in: staleCodes } },
    });
    for (const m of masters) {
      if (m.full_name) masterMap.set(m.employee_code, m.full_name);
    }

    for (const code of staleCodes) {
      this.trackingGateway.broadcastLocationUpdate({
        id: code,
        deviceId: code,
        employee_code: code,
        name: masterMap.get(code) || `Employee ${code}`,
        status: 'Offline',
        lat: null,
        lng: null,
      });
    }
  }

  async markOfflineExplicit(employeeCode: string) {
    if (!employeeCode) return;

    await this.prisma.faceProfile.updateMany({
      where: { employee_code: employeeCode },
      data: { login_status: 'N', last_changed_date_time: new Date() },
    });

    const empMaster = await this.prisma.employees_master.findUnique({
      where: { employee_code: employeeCode },
    });

    this.trackingGateway.broadcastLocationUpdate({
      id: employeeCode,
      deviceId: employeeCode,
      employee_code: employeeCode,
      name: empMaster?.full_name || `Employee ${employeeCode}`,
      status: 'Offline',
      lat: null,
      lng: null,
    });
  }
}
