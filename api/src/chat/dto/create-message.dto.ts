import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  senderId!: string;   // sender of the message

  @IsOptional()
  receiverId?: string; // optional, if direct message

  @IsOptional()
  lessonId?: string;   // optional, if lesson chat

  @IsNotEmpty()
  content!: string;
}

