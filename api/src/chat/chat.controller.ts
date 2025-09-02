import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendMessage(@Body() dto: CreateMessageDto) {
    return this.chatService.sendMessage(dto);
  }

  @Get('messages/:userId1/:userId2')
  async getMessagesBetweenUsers(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    return this.chatService.getMessagesBetweenUsers(userId1, userId2);
  }
}
