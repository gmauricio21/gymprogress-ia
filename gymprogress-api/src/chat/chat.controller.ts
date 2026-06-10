import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { adminAuth } from '../firebase-admin';

type ChatBody = {
  message: string;
};

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private async getUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const token = authorization.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);

    return decodedToken.uid;
  }

  @Get('usage')
  async getUsage(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);

    return this.chatService.getDailyUsage(userId);
  }

  @Post()
  async sendMessage(
    @Body() body: ChatBody,
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.message || !body.message.trim()) {
      throw new BadRequestException('Mensagem é obrigatória.');
    }

    const userId = await this.getUserId(authorization);

    return this.chatService.sendMessage(userId, body.message);
  }
}
