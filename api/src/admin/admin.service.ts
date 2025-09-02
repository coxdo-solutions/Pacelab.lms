import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalCourses = await this.prisma.course.count();
    const totalEnrollments = await this.prisma.enrollment.count();

    // Example static values (replace with real calculations later)
    const completionRate = 72;
    const activeUsers = 85;
    const newUsersThisMonth = 15;

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      completionRate,
      activeUsers,
      newUsersThisMonth,
    };
  }

  async getCategoryDistribution() {
    const categories = await this.prisma.course.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    return categories.map((c) => ({
      name: c.category ?? 'Uncategorized', // ✅ handle null safely
      value: c._count.category,
    }));
  }
}
