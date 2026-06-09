import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async sendMessage(message: string) {
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

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
    });

    return {
      answer: result.response.text(),
    };
  }
}
