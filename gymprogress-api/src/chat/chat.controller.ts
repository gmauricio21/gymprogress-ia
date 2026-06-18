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

/**
 * Controlador responsável pelo gerenciamento das conversas com a IA.
 *
 * Disponibiliza endpoints para:
 * - consultar limite diário de uso;
 * - criar e listar conversas;
 * - recuperar mensagens;
 * - enviar mensagens para a IA;
 * - receber respostas em streaming;
 * - excluir conversas.
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Obtém o identificador do usuário autenticado a partir do token JWT.
   *
   * O token é enviado no cabeçalho Authorization no formato:
   * Bearer <token>.
   *
   * Caso o token esteja ausente ou inválido, uma exceção de
   * autenticação é lançada.
   */
  private async getUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    const token = authorization.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  }

  /**
   * Retorna as informações de utilização diária da IA pelo usuário.
   *
   * Utilizado para controlar o limite diário de mensagens.
   */
  @Get('usage')
  async getUsage(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.chatService.getDailyUsage(userId);
  }

  /**
   * Cria uma nova conversa para o usuário autenticado.
   */
  @Post('conversations')
  async createConversation(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.chatService.createConversation(userId);
  }

  /**
   * Retorna todas as conversas cadastradas pelo usuário.
   */
  @Get('conversations')
  async getConversations(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.chatService.getConversations(userId);
  }

  /**
   * Retorna todas as mensagens de uma conversa específica.
   */
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.chatService.getMessages(userId, conversationId);
  }

  /**
   * Envia uma mensagem para a IA e retorna a resposta completa.
   *
   * Este endpoint é utilizado quando não há necessidade
   * de exibir a resposta em tempo real.
   */
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

  /**
   * Envia uma mensagem para a IA e retorna a resposta em streaming.
   *
   * A resposta é enviada em pequenos trechos (chunks),
   * permitindo que o frontend exiba o texto progressivamente,
   * simulando a digitação da IA em tempo real.
   */
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

    // Configura a resposta para utilizar Server-Sent Events (SSE),
    // permitindo que o frontend receba a resposta da IA em pequenos
    // trechos (chunks) e a exiba progressivamente na interface.
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

  /**
   * Exclui uma conversa e todas as suas mensagens associadas.
   */
  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.chatService.deleteConversation(userId, conversationId);
  }
}
