import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async enrollUser(userId: number, courseId: number) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({ where: { id: courseId.toString() } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.enrollment.create({
      data: {
        userId: userId.toString(),
        courseId: courseId.toString(),
      },
    });
  }

  async findUserEnrollments(userId: number) {
    return this.prisma.enrollment.findMany({
      where: { userId: userId.toString() },
      include: {
        course: true,
      },
    });
  }

  async findCourseEnrollments(courseId: number) {
    return this.prisma.enrollment.findMany({
      where: { courseId: courseId.toString() },
      include: {
        user: true,
      },
    });
  }

  async unenroll(userId: number, courseId: number) {
    return this.prisma.enrollment.deleteMany({
      where: { userId: userId.toString(), courseId: courseId.toString() },
    });
  }
}
