import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmployeeValidationResult {
  valid: boolean;
  employeeCode?: string;
  name?: string;
  message?: string;
}

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate employee code against HRMS employees_master.
   */
  async validateEmployeeCode(employeeCode: string): Promise<EmployeeValidationResult> {
    if (!employeeCode || !employeeCode.trim()) {
      return { valid: false, message: 'Employee code is required' };
    }

    const cleanCode = employeeCode.trim();
    const employee = await this.prisma.employees_master.findUnique({
      where: { employee_code: cleanCode },
    });

    if (!employee) {
      return { valid: false, message: 'Employee code does not exist in the HRMS system' };
    }

    return {
      valid: true,
      employeeCode: employee.employee_code,
      name: employee.full_name || `Employee ${employee.employee_code}`,
    };
  }

  /**
   * Find all employee profiles for Web Dashboard.
   * Optimized: uses DISTINCT ON to get only the latest log per employee instead of loading all logs.
   */
  async findAll(): Promise<unknown[]> {
    const profiles = await this.prisma.faceProfile.findMany({
      where: { delete_flag: 'N' },
      orderBy: { last_changed_date_time: 'desc' },
    });

    if (profiles.length === 0) return [];

    const employeeCodes = profiles.map((p) => p.employee_code);

    // Fetch employees_master in one query
    const employeesMaster = await this.prisma.employees_master.findMany({
      where: { employee_code: { in: employeeCodes } },
    });

    // Fetch only the latest log per employee (single query, not all logs)
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

    // Map logs by employee_code (most recent)
    const logMap = new Map<string, (typeof latestLogs)[0]>();
    for (const log of latestLogs) {
      logMap.set(log.employee_code, log);
    }

    // Map master full_name
    const masterMap = new Map<string, string>();
    for (const emp of employeesMaster) {
      if (emp.full_name) {
        masterMap.set(emp.employee_code, emp.full_name);
      }
    }

    return profiles.map((p) => {
      const lastLog = logMap.get(p.employee_code);
      const empName = masterMap.get(p.employee_code) || `Employee ${p.employee_code}`;
      return {
        employee_code: p.employee_code,
        deviceId: p.device_id,
        device_id: p.device_id,
        name: empName,
        status: p.login_status === 'Y',
        login_status: p.login_status,
        createdAt: p.registered_date_time,
        updatedAt: p.last_changed_date_time,
        last_login_date_time: p.last_login_date_time,
        lastLocationAt: lastLog ? lastLog.recorded_date_time : null,
        address: lastLog ? lastLog.address : null,
        lat: lastLog ? lastLog.latitude : null,
        lng: lastLog ? lastLog.longitude : null,
        faceProfile: {
          referenceImage: p.registered_face_image,
          registered_face_image: p.registered_face_image,
          lastLoginImage: p.last_login_image,
          last_login_image: p.last_login_image,
          lastVerifiedAt: p.last_login_date_time,
        },
      };
    });
  }

  async delete(employeeCode: string, deviceId: string) {
    return await this.prisma.faceProfile.update({
      where: {
        employee_code_device_id: {
          employee_code: employeeCode,
          device_id: deviceId,
        },
      },
      data: {
        delete_flag: 'Y',
        login_status: 'N',
        last_changed_date_time: new Date(),
      },
    });
  }
}
