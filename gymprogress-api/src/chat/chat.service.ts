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
  age?: string;
  gender?: string;
  weight?: string;
  height?: string;
  goal?: string;
  limitations?: string;
};

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private readonly DAILY_LIMIT = 15;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getTodayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

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

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (!userSnap.exists) return {};
    return userSnap.data() as UserProfile;
  }

  // Cria uma nova conversa e retorna o ID
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

  // Lista todas as conversas do usuário
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

  // Busca as mensagens de uma conversa
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

    // Se já existe uma conversa, busca o histórico
    // Se não existe, deixa para criar só após a IA responder
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
            role: data.role === 'assistant' ? 'model' : data.role, // ← conversão aqui
            parts: [{ text: data.content }],
          };
        })
      : []; // ← adiciona isso

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `
Você é o GymProgress IA, um assistente especializado exclusivamente em academia, musculação, treinos, exercícios físicos, organização de fichas de treino e dúvidas relacionadas à prática segura de atividades físicas.

Dados do usuário atual:
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

      // Só cria a conversa agora, após a IA responder com sucesso
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

      // Pequeno delay garante timestamps diferentes
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
            title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
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

      let fullAnswer = '';

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
            title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
          }),
        },
        { merge: true },
      );

      res.write(
        `data: ${JSON.stringify({ done: true, usage, conversationId: convId })}\n\n`,
      );
      res.end();
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
