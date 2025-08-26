// src/admin/admin.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    const categories = await this.adminService.getCategoryDistribution();
    return { ...stats, categories };
  }
}
