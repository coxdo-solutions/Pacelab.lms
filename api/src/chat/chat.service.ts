import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Send a message (lesson chat or direct user)
  async sendMessage(dto: CreateMessageDto) {
    return this.prisma.message.create({
      data: {
        senderId: dto.senderId,
        receiverId: dto.receiverId,
        lessonId: dto.lessonId,
        content: dto.content,
      },
    });
  }

  // Get all messages for a specific lesson
  async getMessagesForLesson(lessonId: string) {
    return this.prisma.message.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true }, // include sender info
    });
  }

  // Get all messages between two users
  async getMessagesBetweenUsers(userId1: string, userId2: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: true, receiver: true },
    });
  }
}

