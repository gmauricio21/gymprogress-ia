import { GoogleGenerativeAI } from '@google/generative-ai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { adminDb } from '../firebase-admin';

type UsageData = {
  count?: number;
};

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private readonly DAILY_LIMIT = 10;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

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
          'Você atingiu o limite diário de 10 mensagens. O limite será renovado após 00:00.',
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

  async sendMessage(userId: string, message: string) {
    const currentUsage = await this.getDailyUsage(userId);

    if (currentUsage.used >= this.DAILY_LIMIT) {
      throw new HttpException(
        'Você atingiu o limite diário de 10 mensagens. O limite será renovado após 00:00.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `
Você é o GymProgress IA, um assistente especializado exclusivamente em academia, musculação, treinos, exercícios físicos, organização de fichas de treino e dúvidas relacionadas à prática segura de atividades físicas.

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
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
      });

      const usage = await this.incrementDailyUsage(userId);

      return {
        answer: result.response.text(),
        usage,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

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
}
