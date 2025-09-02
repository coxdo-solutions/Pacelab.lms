import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateLessonDto } from '../courses/dto/create-lesson.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user: { id: string; email?: string; role?: string };
}

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // Get all lessons by module
  @Get('module/:moduleId')
  async getLessonsByModule(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findAllByModule(moduleId);
  }

  // Get single lesson
  @Get(':id')
  async getLesson(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  // Update lesson progress (authenticated)
  @UseGuards(AuthGuard('jwt'))
  @Post('progress')
  async updateProgress(
    @Req() req: AuthRequest,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.lessonsService.updateProgress(req.user.id, dto);
  }

  // Create a lesson (protect if only instructors/admins should do this)
  @UseGuards(AuthGuard('jwt')) // <- remove if you want it public
  @Post('create')
  async createLesson(@Body() dto: CreateLessonDto) {
    return this.lessonsService.createLesson(dto);
  }
}
