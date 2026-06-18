import { Content, GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentData,
  FieldValue,
  QuerySnapshot,
} from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';

type UsageData = {
  count?: number;
};

type UserProfile = {
  name?: string;
  age?: string;
  gender?: string;
  weight?: string;
  height?: string;
  goal?: string;
  limitations?: string;
};

/**
 * Serviço responsável pela regra de negócio do chat com IA.
 *
 * Controla:
 * - integração com o Gemini;
 * - limite diário de mensagens;
 * - histórico de conversas;
 * - personalização por perfil do usuário;
 * - respostas comuns e respostas em streaming.
 */
@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private readonly DAILY_LIMIT = 15;

  /**
   * Inicializa o serviço da IA utilizando a chave configurada
   * nas variáveis de ambiente.
   */
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Gera a chave da data atual no fuso horário de São Paulo.
   *
   * Essa chave é usada para controlar o limite diário de mensagens.
   */
  private getTodayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  /**
   * Retorna o uso diário de mensagens do usuário.
   */
  async getDailyUsage(userId: string) {
    const todayKey = this.getTodayKey();
    const usageRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc(todayKey);

    const usageSnap = await usageRef.get();
    const usageData = usageSnap.data() as UsageData | undefined;
    const used = usageSnap.exists ? (usageData?.count ?? 0) : 0;

    return {
      used,
      limit: this.DAILY_LIMIT,
      remaining: Math.max(this.DAILY_LIMIT - used, 0),
      date: todayKey,
    };
  }

  /**
   * Incrementa o uso diário de mensagens do usuário.
   *
   * A operação é feita em transação para evitar inconsistências
   * caso várias mensagens sejam enviadas ao mesmo tempo.
   */
  private async incrementDailyUsage(userId: string) {
    const todayKey = this.getTodayKey();
    const usageRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc(todayKey);

    return adminDb.runTransaction(async (transaction) => {
      const usageSnap = await transaction.get(usageRef);
      const usageData = usageSnap.data() as UsageData | undefined;
      const currentCount = usageSnap.exists ? (usageData?.count ?? 0) : 0;

      if (currentCount >= this.DAILY_LIMIT) {
        throw new HttpException(
          'Você atingiu o limite diário de 15 mensagens. O limite será renovado após 00:00.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const newCount = currentCount + 1;
      transaction.set(
        usageRef,
        {
          count: newCount,
          limit: this.DAILY_LIMIT,
          date: todayKey,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      return {
        used: newCount,
        limit: this.DAILY_LIMIT,
        remaining: Math.max(this.DAILY_LIMIT - newCount, 0),
        date: todayKey,
      };
    });
  }

  /**
   * Busca os dados de perfil do usuário para personalizar
   * as respostas da IA.
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (!userSnap.exists) return {};
    return userSnap.data() as UserProfile;
  }

  /**
   * Cria uma nova conversa no Firestore.
   */
  async createConversation(userId: string) {
    const convRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .doc();

    await convRef.set({
      title: 'Nova conversa',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { conversationId: convRef.id };
  }

  /**
   * Lista todas as conversas do usuário, ordenadas pela mais recente.
   */
  async getConversations(userId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .orderBy('updatedAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Busca todas as mensagens de uma conversa específica.
   */
  async getMessages(userId: string, conversationId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Envia uma mensagem para a IA e retorna a resposta completa.
   *
   * Também salva a mensagem do usuário, a resposta da IA,
   * atualiza o uso diário e registra a conversa no Firestore.
   */
  async sendMessage(
    userId: string,
    conversationId: string | null,
    message: string,
  ) {
    const currentUsage = await this.getDailyUsage(userId);

    if (currentUsage.used >= this.DAILY_LIMIT) {
      throw new HttpException(
        'Você atingiu o limite diário de 15 mensagens. O limite será renovado após 00:00.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    /**
     * Recupera o perfil e o histórico para contextualizar a resposta da IA.
     * */
    const userProfile = await this.getUserProfile(userId);

    let convId = conversationId;
    let historySnap: QuerySnapshot<DocumentData> | undefined;

    if (convId) {
      const messagesRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(convId)
        .collection('messages');

      historySnap = await messagesRef.orderBy('createdAt', 'asc').get();
    }

    const history: Content[] = historySnap
      ? historySnap.docs.map((doc) => {
          const data = doc.data() as {
            role: 'user' | 'model' | 'assistant';
            content: string;
          };
          return {
            role: data.role === 'assistant' ? 'model' : data.role,
            parts: [{ text: data.content }],
          };
        })
      : [];

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `
Você é o GymProgress IA, um assistente especializado exclusivamente em academia, musculação, treinos, exercícios físicos, organização de fichas de treino e dúvidas relacionadas à prática segura de atividades físicas.

Dados do usuário atual:
- Nome: ${userProfile.name ?? 'não informado'}
- Idade: ${userProfile.age ?? 'não informada'}
- Gênero: ${userProfile.gender ?? 'não informado'}
- Peso: ${userProfile.weight ? userProfile.weight + ' kg' : 'não informado'}
- Altura: ${userProfile.height ? userProfile.height + ' cm' : 'não informada'}
- Objetivo: ${userProfile.goal ?? 'não informado'}
- Restrições/Limitações: ${userProfile.limitations ?? 'nenhuma informada'}

Use sempre essas informações para personalizar suas respostas. Adapte a intensidade, volume e escolha dos exercícios de acordo com a idade, objetivo e limitações do usuário.

Responda apenas perguntas relacionadas a:
- musculação;
- academia;
- exercícios físicos;
- divisão de treinos;
- execução de exercícios;
- hipertrofia;
- emagrecimento relacionado a treino;
- condicionamento físico;
- descanso entre séries;
- segurança durante exercícios.

Se o usuário perguntar algo fora desse tema, responda educadamente:
"Posso te ajudar apenas com assuntos relacionados a treinos, academia e exercícios físicos."

Não forneça diagnósticos médicos.
Não substitua orientação de médicos, fisioterapeutas ou profissionais de educação física.
Se houver dor, lesão grave ou condição médica, recomende procurar um profissional qualificado.

Responda em português do Brasil, de forma clara, objetiva e amigável.
    `,
    });

    try {
      const result = await model.generateContent({
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
      });

      const answer = result.response.text();
      /*
       * Cria a conversa somente após uma resposta válida da IA.
       */
      if (!convId) {
        const created = await this.createConversation(userId);
        convId = created.conversationId;
      }

      const convRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(convId);

      const messagesRef = convRef.collection('messages');
      const usage = await this.incrementDailyUsage(userId);
      const now = FieldValue.serverTimestamp();
      const userMsgRef = messagesRef.doc();
      const assistantMsgRef = messagesRef.doc();

      await userMsgRef.set({ role: 'user', content: message, createdAt: now });
      /*
       * Pequeno atraso para reduzir chance de timestamps iguais entre mensagens.
       */
      await new Promise((resolve) => setTimeout(resolve, 50));

      const assistantNow = FieldValue.serverTimestamp();
      await assistantMsgRef.set({
        role: 'model',
        content: answer,
        createdAt: assistantNow,
      });

      const isFirstMessage: boolean = !historySnap || historySnap.empty;

      await convRef.set(
        {
          updatedAt: now,
          ...(isFirstMessage && {
            title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
          }),
        },
        { merge: true },
      );

      // Retorna convId (nunca null aqui) em vez de conversationId
      return { answer, usage, conversationId: convId };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;

      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status: number }).status === 429
      ) {
        throw new HttpException(
          'O serviço de IA está temporariamente sobrecarregado. Tente novamente em alguns minutos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        'Erro ao consultar a IA. Tente novamente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Exclui uma conversa e suas mensagens associadas.
   */
  async deleteConversation(userId: string, conversationId: string) {
    const convRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .doc(conversationId);

    // Deleta todas as mensagens da subcoleção primeiro
    const messagesSnap = await convRef.collection('messages').get();
    const batch = adminDb.batch();
    messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(convRef);
    await batch.commit();

    return { success: true };
  }

  /**
   * Envia uma mensagem para a IA e retorna a resposta em streaming.
   *
   * A resposta é enviada ao frontend em pequenos trechos (chunks),
   * permitindo exibição progressiva da mensagem na interface.
   */
  async streamMessage(
    userId: string,
    conversationId: string | null,
    message: string,
    res: Response,
  ) {
    const currentUsage = await this.getDailyUsage(userId);

    if (currentUsage.used >= this.DAILY_LIMIT) {
      res.write(
        `data: ${JSON.stringify({ error: 'Você atingiu o limite diário de mensagens. O limite será renovado após 00:00.' })}\n\n`,
      );
      res.end();
      return;
    }

    const userProfile = await this.getUserProfile(userId);

    let convId = conversationId;
    let historySnap: QuerySnapshot<DocumentData> | undefined;

    if (convId) {
      const messagesRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(convId)
        .collection('messages');

      historySnap = await messagesRef.orderBy('createdAt', 'asc').get();
    }

    const history: Content[] = historySnap
      ? historySnap.docs.map((doc) => {
          const data = doc.data() as {
            role: 'user' | 'model' | 'assistant';
            content: string;
          };
          return {
            role: data.role === 'assistant' ? 'model' : data.role,
            parts: [{ text: data.content }],
          };
        })
      : [];

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `
Você é o GymProgress IA, um assistente especializado exclusivamente em academia, musculação, treinos, exercícios físicos, organização de fichas de treino e dúvidas relacionadas à prática segura de atividades físicas.

Dados do usuário atual:
- Nome: ${userProfile.name ?? 'não informado'}
- Idade: ${userProfile.age ?? 'não informada'}
- Gênero: ${userProfile.gender ?? 'não informado'}
- Peso: ${userProfile.weight ? userProfile.weight + ' kg' : 'não informado'}
- Altura: ${userProfile.height ? userProfile.height + ' cm' : 'não informada'}
- Objetivo: ${userProfile.goal ?? 'não informado'}
- Restrições/Limitações: ${userProfile.limitations ?? 'nenhuma informada'}

Use sempre essas informações para personalizar suas respostas. Adapte a intensidade, volume e escolha dos exercícios de acordo com a idade, objetivo e limitações do usuário.

Responda apenas perguntas relacionadas a:
- musculação;
- academia;
- exercícios físicos;
- divisão de treinos;
- execução de exercícios;
- hipertrofia;
- emagrecimento relacionado a treino;
- condicionamento físico;
- descanso entre séries;
- segurança durante exercícios.

Se o usuário perguntar algo fora desse tema, responda educadamente:
"Posso te ajudar apenas com assuntos relacionados a treinos, academia e exercícios físicos."

Não forneça diagnósticos médicos.
Não substitua orientação de médicos, fisioterapeutas ou profissionais de educação física.
Se houver dor, lesão grave ou condição médica, recomende procurar um profissional qualificado.

Responda em português do Brasil, de forma clara, objetiva e amigável.
    `,
    });

    try {
      const streamResult = await model.generateContentStream({
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
      });

      // Acumula a resposta completa para salvá-la no histórico ao final do stream.
      let fullAnswer = '';

      // Envia cada trecho gerado pela IA para o frontend via SSE.
      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        fullAnswer += text;
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }

      if (!convId) {
        const created = await this.createConversation(userId);
        convId = created.conversationId;
      }

      const convRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(convId);

      const messagesRef = convRef.collection('messages');
      const usage = await this.incrementDailyUsage(userId);
      const now = FieldValue.serverTimestamp();

      await messagesRef
        .doc()
        .set({ role: 'user', content: message, createdAt: now });
      await new Promise((resolve) => setTimeout(resolve, 50));
      await messagesRef.doc().set({
        role: 'model',
        content: fullAnswer,
        createdAt: FieldValue.serverTimestamp(),
      });

      const isFirstMessage: boolean = !historySnap || historySnap.empty;

      await convRef.set(
        {
          updatedAt: now,
          ...(isFirstMessage && {
            title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
          }),
        },
        { merge: true },
      );

      // Informa ao frontend que o stream terminou e envia os dados atualizados.
      res.write(
        `data: ${JSON.stringify({ done: true, usage, conversationId: convId })}\n\n`,
      );
      res.end();
      // Retorna o erro pelo próprio stream para que o frontend trate a mensagem.
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status: number }).status === 429
      ) {
        res.write(
          `data: ${JSON.stringify({ error: 'O serviço de IA está temporariamente sobrecarregado. Tente novamente em alguns minutos.' })}\n\n`,
        );
      } else {
        res.write(
          `data: ${JSON.stringify({ error: 'Erro ao consultar a IA. Tente novamente.' })}\n\n`,
        );
      }
      res.end();
    }
  }
}
