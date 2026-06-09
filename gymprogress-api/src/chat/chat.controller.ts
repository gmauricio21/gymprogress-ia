import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';

type ChatBody = {
  message: string;
};

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(@Body() body: ChatBody) {
    if (!body?.message || !body.message.trim()) {
      throw new BadRequestException('Mensagem é obrigatória.');
    }

    return this.chatService.sendMessage(body.message);
  }
}
