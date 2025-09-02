import { IsEmail, IsOptional, IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  password?: string;

  @IsOptional() @IsEnum(Role)
  role?: Role;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  assignedCourseIds?: string[];
}
