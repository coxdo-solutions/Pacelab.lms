import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateModuleDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsNumber()
  order!: number;

  @IsNotEmpty()
  @IsString()
  courseId!: string; // UUID string
}

