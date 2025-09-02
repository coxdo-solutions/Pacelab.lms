import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // === Courses ===
  async createCourse(dto: CreateCourseDto) {
    const created = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        thumbnail: dto.thumbnail ?? null,
      },
    });

    // Normalize shape expected by admin UI
    return {
      id: created.id,
      title: created.title,
      description: created.description ?? '',
      thumbnail: created.thumbnail ?? '',
      isActive: true,
      createdAt: created.createdAt,
      moduleCount: 0,
      enrollmentCount: 0,
    };
  }

  async findAllCourses() {
    const rows = await this.prisma.course.findMany({
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? '',
      thumbnail: c.thumbnail ?? '',
      isActive: true,
      createdAt: c.createdAt,
      moduleCount: c._count.modules,
      enrollmentCount: c._count.enrollments,
    }));
  }

  async findOneCourse(id: string) {
    const c = await this.prisma.course.findUnique({
      where: { id },
      include: {
        _count: { select: { modules: true, enrollments: true } },
        modules: { include: { lessons: true } },
      },
    });
    if (!c) throw new NotFoundException(`Course ${id} not found`);

    return {
      id: c.id,
      title: c.title,
      description: c.description ?? '',
      thumbnail: c.thumbnail ?? '',
      isActive: true,
      createdAt: c.createdAt,
      moduleCount: c._count.modules,
      enrollmentCount: c._count.enrollments,
      modules: c.modules,
    };
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const u = await this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        thumbnail: dto.thumbnail,
      },
      include: { _count: { select: { modules: true, enrollments: true } } },
    });

    return {
      id: u.id,
      title: u.title,
      description: u.description ?? '',
      thumbnail: u.thumbnail ?? '',
      isActive: true,
      createdAt: u.createdAt,
      moduleCount: u._count.modules,
      enrollmentCount: u._count.enrollments,
    };
  }

  async removeCourse(id: string) {
    await this.prisma.course.delete({ where: { id } });
    return { id };
  }

  async updateStatus(_id: string, _isActive: boolean) {
    throw new BadRequestException(
      'Course status is not persisted because the "isActive" column does not exist. ' +
        'Either remove the toggle in the admin UI or add to Prisma:\n\n' +
        'model Course { ... isActive Boolean @default(true) }\n\n' +
        'Then run: npx prisma db push',
    );
  }

  // === Modules ===
  async createModule(dto: CreateModuleDto) {
    return this.prisma.module.create({
      data: {
        title: dto.title,
        order: dto.order,
        course: { connect: { id: dto.courseId } },
      },
    });
  }

  async findModules(courseId: string) {
    return this.prisma.module.findMany({
      where: { courseId },
      include: { lessons: true },
    });
  }

  // === Lessons ===
  async createLesson(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        title: dto.title ?? 'Untitled Lesson',
        videoUrl: dto.videoUrl || '',
        youtubeId: dto.youtubeId || '',
        duration: dto.duration ?? null,
        order: dto.order,
        module: { connect: { id: dto.moduleId } },
      },
    });
  }

  async findLessons(moduleId: string) {
    return this.prisma.lesson.findMany({ where: { moduleId } });
  }
}
