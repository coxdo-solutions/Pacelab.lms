// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** ✅ Create a new user with assigned courses */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** ✅ Get all users with courses */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /** ✅ Get one user with courses */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** ✅ Get the user's courses (deep: modules + lessons) */
  @Get(':id/courses')
  findUserCourses(@Param('id') id: string) {
    return this.usersService.getUserCourses(id);
  }

  /** ✅ Update user details & assigned courses */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /** ✅ Toggle status (Active/Suspended) */
  @Patch(':id/status')
  toggleStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED',
  ) {
    return this.usersService.updateStatus(id as any, status as any);
  }

  /** ✅ Delete a user */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
