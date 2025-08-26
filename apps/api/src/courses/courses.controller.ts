// src/courses/courses.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // === Courses ===
  @Post()
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Get()
  findAllCourses() {
    return this.coursesService.findAllCourses();
  }

  @Get(':id')
  findOneCourse(@Param('id') id: string) {
    return this.coursesService.findOneCourse(id);
  }

  @Patch(':id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, dto);
  }

  @Delete(':id')
  removeCourse(@Param('id') id: string) {
    return this.coursesService.removeCourse(id);
  }

  // === Modules ===
  @Post('modules')
  createModule(@Body() dto: CreateModuleDto) {
    return this.coursesService.createModule(dto);
  }

  @Get(':courseId/modules')
  findModules(@Param('courseId') courseId: string) {
    return this.coursesService.findModules(courseId);
  }

  // === Lessons ===
  @Post('lessons')
  createLesson(@Body() dto: CreateLessonDto) {
    return this.coursesService.createLesson(dto);
  }

  @Get('modules/:moduleId/lessons')
  findLessons(@Param('moduleId') moduleId: string) {
    return this.coursesService.findLessons(moduleId);
  }
}
