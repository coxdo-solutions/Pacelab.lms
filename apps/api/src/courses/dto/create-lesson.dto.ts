import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLessonDto {
  // Optional: if omitted and a YouTube ID/URL is provided, we'll use the YouTube title
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Preferred: can be a full YouTube URL or an 11-char ID
  @IsOptional()
  @IsString()
  youtubeIdOrUrl?: string;

  // Legacy support (still accepted)
  @IsOptional()
  @IsString()
  youtubeId?: string;

  // Fallback non-YouTube URL (e.g., S3/CDN)
  @IsOptional()
  @IsString()
  videoUrl?: string;

  // Duration in seconds; if omitted and YouTube provided, we’ll fetch via API
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  // Optional: service will default to 1 if not provided
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  order?: number;

  // Optional: allow marking certain lessons as preview
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPreview?: boolean;

  // Required: parent module
  @IsNotEmpty()
  @IsString()
  moduleId!: string; // UUID string
}


