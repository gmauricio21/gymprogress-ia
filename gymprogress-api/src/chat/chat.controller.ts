import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { adminAuth } from '../firebase-admin';
import { Delete } from '@nestjs/common'; // adicionar Delete ao import

type ChatBody = {
  message: string;
  conversationId: string | null;
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

  @Post('conversations')
  async createConversation(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.chatService.createConversation(userId);
  }

  @Get('conversations')
  async getConversations(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.chatService.getMessages(userId, conversationId);
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
    return this.chatService.sendMessage(
      userId,
      body.conversationId ?? null,
      body.message,
    );
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.chatService.deleteConversation(userId, conversationId);
  }
}
