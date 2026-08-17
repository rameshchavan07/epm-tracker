import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('validate')
  async validate(@Body() body: { employeeCode: string }) {
    return await this.employeesService.validateEmployeeCode(body.employeeCode);
  }

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
