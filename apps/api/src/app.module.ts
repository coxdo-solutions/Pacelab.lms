// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { ChatModule } from './chat/chat.module';
import { YoutubeModule } from './youtube/youtube.module';
import { AdminModule } from './admin/admin.module'; // 👈 added for dashboard/admin APIs

@Module({
  imports: [
    // ✅ Global env variables, supports .env.local and .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // loads .env.local first, falls back to .env
    }),

    // ✅ Core infrastructure
    PrismaModule,
    RedisModule,

    // ✅ Business modules
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    ChatModule,
    YoutubeModule,
    AdminModule, // 👈 include Admin dashboard module
  ],
})
export class AppModule {}


