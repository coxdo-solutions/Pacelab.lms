import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateLessonDto } from '../courses/dto/create-lesson.dto';
import { extractYouTubeId } from './utils/youtube.util';
import { YoutubeService } from '../youtube/youtube.service';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private youtube: YoutubeService,
  ) {}

  async createLesson(dto: CreateLessonDto) {
    // Accept youtubeIdOrUrl (preferred), legacy youtubeId, or extract from videoUrl if it’s a YT link.
    const youtubeId =
      extractYouTubeId(dto.youtubeIdOrUrl) ||
      extractYouTubeId(dto.youtubeId) ||
      extractYouTubeId(dto.videoUrl);

    // Validate at least one source
    if (!youtubeId && !dto.videoUrl) {
      throw new BadRequestException('Provide either youtubeIdOrUrl/youtubeId or a non-YouTube videoUrl.');
    }

    let finalTitle = (dto.title ?? '').trim();
    let finalDuration = dto.duration ?? null;

    // Pull metadata from YouTube when possible
    let youtubePublishedAt: Date | null = null;
    let youtubeChannelTitle: string | null = null;
    let youtubeViewCount: number | null = null;

    if (youtubeId) {
      const details = await this.youtube.getVideosDetails(youtubeId); // handles single id string
      const meta = details?.[0];
      if (meta) {
        if (!finalTitle) finalTitle = meta.title?.trim?.() || '';
        if (finalDuration == null) finalDuration = isoDurationToSeconds(meta.duration);

        // Optional: persist extra metadata if your schema has these fields
        youtubePublishedAt = meta.publishedAt ? new Date(meta.publishedAt) : null;
        youtubeChannelTitle = meta.channelTitle ?? null;
        youtubeViewCount = Number.isFinite(meta.viewCount) ? meta.viewCount : null;
      }
    }

    return this.prisma.lesson.create({
      data: {
        title: finalTitle || 'Untitled Lesson',
        description: dto.description ?? null,
        isPreview: dto.isPreview ?? false,

        youtubeId: youtubeId || null,
        videoUrl: youtubeId
          ? `https://www.youtube.com/watch?v=${youtubeId}`
          : (dto.videoUrl as string),

        duration: finalDuration,
        order: dto.order ?? 1,

        // Optional metadata (only include if these columns exist in your Prisma schema)
        youtubePublishedAt: youtubePublishedAt ?? undefined,
        youtubeChannelTitle: youtubeChannelTitle ?? undefined,
        youtubeViewCount: youtubeViewCount ?? undefined,

        module: { connect: { id: dto.moduleId } },
      },
    });
  }

  async findAllByModule(moduleId: string) {
    return this.prisma.lesson.findMany({
      where: { moduleId },
      include: { module: true },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async updateProgress(userId: string, dto: UpdateProgressDto) {
    const { lessonId } = dto;

    // Coerce progress safely (handles number, numeric string, or undefined)
    const raw = (dto as any).progress;
    const num = typeof raw === 'number' ? raw : Number(raw);
    const safe = Number.isFinite(num) ? num : 0;

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const normalized = Math.max(0, Math.min(100, Math.round(safe)));

    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { progress: normalized, lastWatchedAt: new Date() },
      create: { userId, lessonId, progress: normalized, lastWatchedAt: new Date() },
    });
  }
}

/** Convert ISO8601 duration like PT1H2M10S to seconds */
function isoDurationToSeconds(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}
