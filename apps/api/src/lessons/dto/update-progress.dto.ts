import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  lessonId!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progress?: number;  // 0–100%
}
