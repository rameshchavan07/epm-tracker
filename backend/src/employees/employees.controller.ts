import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll() {
    return await this.employeesService.findAll();
  }

  @Delete(':employeeCode/:deviceId')
  async delete(
    @Param('employeeCode') employeeCode: string,
    @Param('deviceId') deviceId: string,
  ) {
    return await this.employeesService.delete(employeeCode, deviceId);
  }
}
