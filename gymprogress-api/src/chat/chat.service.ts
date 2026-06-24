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
  birthDate?: string;
  gender?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  bmiClassification?: string;
  experienceLevel?: string;
  goal?: string;
  customGoal?: string;
  hasLimitations?: boolean;
  limitations?: string;
};

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private readonly DAILY_LIMIT = 15;

  private readonly SAFE_RESPONSE =
    '⚠️ Esta plataforma possui caráter exclusivamente informativo e não realiza diagnósticos, tratamentos ou prescrições. Em situações envolvendo dor, lesão, gravidez, medicamentos, menores de idade, sintomas físicos ou emergências, procure orientação de um médico, fisioterapeuta ou profissional qualificado.';

  private readonly RISK_TERMS = [
    'dor no peito',
    'dor no coração',
    'dor no peito durante o treino',
    'falta de ar',
    'dificuldade para respirar',
    'desmaio',
    'quase desmaiei',
    'tontura',
    'mal estar',
    'fraqueza',
    'suor frio',
    'palpitação',
    'palpitacao',
    'coração acelerado',
    'coracao acelerado',
    'coração disparado',
    'coracao disparado',
    'pressão alta',
    'pressao alta',
    'pressão baixa',
    'pressao baixa',
    'hipertensão',
    'hipertensao',
    'hipotensão',
    'hipotensao',
    'queda de pressão',
    'queda de pressao',
    'pressão desregulada',
    'pressao desregulada',
    'arritmia',
    'aritimia',
    'arritmia cardíaca',
    'arritmia cardiaca',
    'risco cardiológico',
    'risco cardiologico',
    'problema cardíaco',
    'problema cardiaco',
    'doença cardíaca',
    'doenca cardiaca',
    'insuficiência cardíaca',
    'insuficiencia cardiaca',
    'infarto',
    'ataque cardíaco',
    'ataque cardiaco',
    'angina',
    'taquicardia',
    'bradicardia',
    'lesão',
    'lesao',
    'machuquei',
    'rompi',
    'ruptura',
    'fratura',
    'entorse',
    'luxação',
    'luxacao',
    'distensão',
    'distensao',
    'tendinite',
    'dor no joelho',
    'dor no ombro',
    'dor na coluna',
    'dor lombar',
    'dor cervical',
    'dor nas costas',
    'hérnia',
    'hernia',
    'hérnia de disco',
    'hernia de disco',
    'escoliose',
    'lordose',
    'cifose',
    'problema na coluna',
    'doença',
    'doenca',
    'doenças',
    'doencas',
    'diabetes',
    'pré-diabetes',
    'pre diabetes',
    'asma',
    'bronquite',
    'epilepsia',
    'câncer',
    'cancer',
    'covid',
    'covid-19',
    'gripe forte',
    'pneumonia',
    'medicamento',
    'medicamentos',
    'remédio',
    'remedio',
    'remédios',
    'remedios',
    'antidepressivo',
    'ansiolítico',
    'ansiolitico',
    'anti-inflamatório',
    'anti inflamatorio',
    'corticoide',
    'insulina',
    'grávida',
    'gravida',
    'gravidez',
    '13 anos',
    '14 anos',
    '15 anos',
    '16 anos',
    'perder 10 quilos rapidamente',
    'perder peso muito rápido',
    'perder peso muito rapido',
    'emagrecer rápido',
    'emagrecer rapido',
    'emagrecimento extremo',
  ];

  private readonly RISK_KEYWORDS = [
    'dor',
    'lesão',
    'lesao',
    'doença',
    'doenca',
    'sintoma',
    'sintomas',
    'pressão',
    'pressao',
    'hipertensão',
    'hipertensao',
    'hipotensão',
    'hipotensao',
    'cardíaco',
    'cardiaco',
    'coração',
    'coracao',
    'arritmia',
    'infarto',
    'medicamento',
    'remédio',
    'remedio',
    'gravidez',
    'grávida',
    'gravida',
  ];

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

  private calculateAge(birthDate?: string): string {
    if (!birthDate) return 'não informada';

    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age >= 0 ? `${age} anos` : 'não informada';
  }

  private formatGender(gender?: string): string {
    const values: Record<string, string> = {
      masculino: 'Masculino',
      feminino: 'Feminino',
      nao_informar: 'Outros / Prefiro não dizer',
    };

    return gender ? (values[gender] ?? gender) : 'não informado';
  }

  private formatGoal(profile: UserProfile): string {
    const values: Record<string, string> = {
      perder_peso: 'Perder peso',
      aumentar_musculos: 'Aumentar músculos',
      definir_musculos: 'Definir músculos',
      outros: profile.customGoal || 'Outro objetivo não especificado',
    };

    return profile.goal
      ? (values[profile.goal] ?? profile.goal)
      : 'não informado';
  }

  private formatExperienceLevel(level?: string): string {
    const values: Record<string, string> = {
      iniciante: 'Iniciante',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
    };

    return level ? (values[level] ?? level) : 'não informado';
  }

  private buildSystemInstruction(userProfile: UserProfile): string {
    const hasLimitations = userProfile.hasLimitations === true;

    return `
Você é o GymProgress IA, um assistente informativo voltado exclusivamente para academia, musculação, treinos, exercícios físicos e organização de fichas de treino.

Dados do usuário atual:
- Nome: ${userProfile.name ?? 'não informado'}
- Data de nascimento: ${userProfile.birthDate ?? 'não informada'}
- Idade calculada: ${this.calculateAge(userProfile.birthDate)}
- Gênero: ${this.formatGender(userProfile.gender)}
- Peso: ${userProfile.weight ? `${userProfile.weight} kg` : 'não informado'}
- Altura: ${userProfile.height ? `${userProfile.height} cm` : 'não informada'}
- IMC: ${userProfile.bmi ? `${userProfile.bmi} kg/m²` : 'não informado'}
- Classificação do IMC: ${userProfile.bmiClassification ?? 'não informada'}
- Nível de experiência: ${this.formatExperienceLevel(userProfile.experienceLevel)}
- Objetivo: ${this.formatGoal(userProfile)}
- Possui restrições/limitações: ${hasLimitations ? 'Sim' : 'Não'}
- Restrições/Limitações: ${
      hasLimitations
        ? userProfile.limitations || 'não especificadas'
        : 'nenhuma informada'
    }

Regras obrigatórias:
- Responda apenas sobre academia, treinos, musculação, exercícios físicos e organização de fichas.
- Não realize diagnósticos médicos.
- Não prescreva medicamentos.
- Não indique tratamentos para doenças, dores ou lesões.
- Não substitua médicos, fisioterapeutas, nutricionistas ou profissionais de Educação Física.
- Não interprete sintomas físicos como dor no peito, falta de ar, tontura, desmaio ou dor intensa.
- Em casos de dor, lesão, gravidez, medicamentos, menores de idade, doença ou emergência, oriente o usuário a procurar um profissional qualificado.
- Use os dados do perfil apenas para contextualização geral e personalização informativa.
- Caso o usuário peça algo fora do escopo, responda: "Posso te ajudar apenas com assuntos relacionados a treinos, academia e exercícios físicos."

Formato da resposta:
- Use português do Brasil.
- Seja claro, direto e objetivo.
- Evite respostas longas.
- Responda preferencialmente em tópicos curtos.
- Não ultrapasse 8 linhas, exceto se o usuário pedir detalhes.
- Evite introduções desnecessárias.
`;
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

  private isRiskMessage(message: string): boolean {
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      this.RISK_TERMS.some((term) =>
        normalized.includes(
          term
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        ),
      ) ||
      this.RISK_KEYWORDS.some((keyword) =>
        normalized.includes(
          keyword
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        ),
      )
    );
  }

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

    if (this.isRiskMessage(message)) {
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

      await messagesRef.doc().set({
        role: 'user',
        content: message,
        createdAt: now,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await messagesRef.doc().set({
        role: 'model',
        content: this.SAFE_RESPONSE,
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

      return {
        answer: this.SAFE_RESPONSE,
        usage,
        conversationId: convId,
      };
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: this.buildSystemInstruction(userProfile),
    });

    try {
      const result = await model.generateContent({
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
      });

      const answer = result.response.text();

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

      await messagesRef.doc().set({
        role: 'user',
        content: message,
        createdAt: now,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await messagesRef.doc().set({
        role: 'model',
        content: answer,
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
        `data: ${JSON.stringify({
          error:
            'Você atingiu o limite diário de mensagens. O limite será renovado após 00:00.',
        })}\n\n`,
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

    if (this.isRiskMessage(message)) {
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

      await messagesRef.doc().set({
        role: 'user',
        content: message,
        createdAt: now,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await messagesRef.doc().set({
        role: 'model',
        content: this.SAFE_RESPONSE,
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

      res.write(`data: ${JSON.stringify({ chunk: this.SAFE_RESPONSE })}\n\n`);
      res.write(
        `data: ${JSON.stringify({ done: true, usage, conversationId: convId })}\n\n`,
      );
      res.end();
      return;
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: this.buildSystemInstruction(userProfile),
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

      await messagesRef.doc().set({
        role: 'user',
        content: message,
        createdAt: now,
      });

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
          `data: ${JSON.stringify({
            error:
              'O serviço de IA está temporariamente sobrecarregado. Tente novamente em alguns minutos.',
          })}\n\n`,
        );
      } else {
        res.write(
          `data: ${JSON.stringify({
            error: 'Erro ao consultar a IA. Tente novamente.',
          })}\n\n`,
        );
      }

      res.end();
    }
  }
}
