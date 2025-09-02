import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('enrollments')
@UseGuards(JwtAuthGuard) // 👈 protects all routes in this controller
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // ✅ Enroll in a course
  @Post(':courseId')
  async enroll(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollmentsService.enrollUser(req.user.id, Number(courseId));
  }

  // ✅ Get all courses the user enrolled in
  @Get('my')
  async getUserEnrollments(@Req() req: any) {
    return this.enrollmentsService.findUserEnrollments(req.user.id);
  }

  // ✅ Get all enrollments of a course
  @Get('course/:courseId')
  async getCourseEnrollments(@Param('courseId') courseId: string) {
    return this.enrollmentsService.findCourseEnrollments(Number(courseId));
  }

  // ✅ Unenroll from a course
  @Delete(':courseId')
  async unenroll(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollmentsService.unenroll(req.user.id, Number(courseId));
  }
}

