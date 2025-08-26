import {
  IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum,
  IsArray, IsUUID
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })   // ensure each is a UUID
  assignedCourseIds?: string[];
}

