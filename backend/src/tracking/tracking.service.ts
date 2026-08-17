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
  avgBattery: number;
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
      `Updated HRMS system_setup_table config to: tracking=${validMinutes}m, face=${faceInterval}m, grace=${gracePeriod}m`,
    );

    return this.getTrackingConfig();
  }

  private async reverseGeocodeOSM(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'EPM-Tracker/1.0' } }
      );
      if (response.ok) {
        const data: any = await response.json();
        return data.display_name || null;
      }
    } catch {
      // Ignore network errors or rate limits for OSM fallback
    }
    return null;
  }

  async processBatch(locations: CreateLocationLogDto[]) {
    if (!locations || locations.length === 0) {
      return { success: true, count: 0 };
    }

    let processedCount = 0;

    for (const loc of locations) {
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

  async getLatestLocations(): Promise<LatestLocationItem[]> {
    const profiles = await this.prisma.faceProfile.findMany({
      where: { delete_flag: 'N' },
    });

    const employeesMaster = await this.prisma.employees_master.findMany();
    const masterMap = new Map<string, string>();
    for (const emp of employeesMaster) {
      if (emp.full_name) {
        masterMap.set(emp.employee_code, emp.full_name);
      }
    }

    const latestLocations: LatestLocationItem[] = [];

    for (const profile of profiles) {
      const latestLog = await this.prisma.locationLog.findFirst({
        where: { employee_code: profile.employee_code },
        orderBy: { recorded_date_time: 'desc' },
      });

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
    const activeCount = await this.prisma.faceProfile.count({
      where: { login_status: 'Y', delete_flag: 'N' },
    });
    const offlineCount = await this.prisma.faceProfile.count({
      where: { login_status: 'N', delete_flag: 'N' },
    });
    const totalCount = await this.prisma.faceProfile.count({
      where: { delete_flag: 'N' },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const totalLogsToday = await this.prisma.locationLog.count({
      where: {
        recorded_date_time: {
          gte: startOfDay,
        },
      },
    });

    return {
      activeUsers: activeCount,
      offlineUsers: offlineCount,
      totalUsers: totalCount,
      totalLogsToday,
      avgBattery: 90,
    };
  }

  @Cron('0 */1 * * * *')
  async markOfflineUsers(): Promise<void> {
    const config = await this.getTrackingConfig();
    const staleMinutes = Math.max(3, Math.ceil(config.trackingIntervalMinutes * 1.5));
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

    const activeProfiles = await this.prisma.faceProfile.findMany({
      where: { login_status: 'Y', delete_flag: 'N' },
    });

    const staleCodes: string[] = [];

    for (const profile of activeProfiles) {
      const latestLog = await this.prisma.locationLog.findFirst({
        where: { employee_code: profile.employee_code },
        orderBy: { recorded_date_time: 'desc' },
      });

      if (!latestLog || latestLog.recorded_date_time < staleCutoff) {
        staleCodes.push(profile.employee_code);
      }
    }

    if (staleCodes.length === 0) return;

    await this.prisma.faceProfile.updateMany({
      where: { employee_code: { in: staleCodes } },
      data: { login_status: 'N', last_changed_date_time: new Date() },
    });

    this.logger.log(`Marked ${staleCodes.length} employee(s) offline: ${staleCodes.join(', ')}`);

    for (const code of staleCodes) {
      this.trackingGateway.broadcastLocationUpdate({
        id: code,
        deviceId: code,
        employee_code: code,
        name: `Employee ${code}`,
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

    this.trackingGateway.broadcastLocationUpdate({
      id: employeeCode,
      deviceId: employeeCode,
      employee_code: employeeCode,
      name: `Employee ${employeeCode}`,
      status: 'Offline',
      lat: null,
      lng: null,
    });
  }
}
