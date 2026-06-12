import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { adminAuth } from '../firebase-admin';
import type { Response } from 'express';

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

  @Post('stream')
  async streamMessage(
    @Body() body: ChatBody,
    @Res() res: Response,
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.message || !body.message.trim()) {
      res.status(400).json({ message: 'Mensagem é obrigatória.' });
      return;
    }

    const userId = await this.getUserId(authorization);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatService.streamMessage(
      userId,
      body.conversationId ?? null,
      body.message,
      res,
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
