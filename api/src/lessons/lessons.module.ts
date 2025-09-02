import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';

@Module({
  controllers: [LessonsController],
  providers: [LessonsService, PrismaService, YoutubeService],
  exports: [LessonsService],
})
export class LessonsModule {}
