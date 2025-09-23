// Path: src/ai/ai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getChatCompletion(persona: string, history: ChatMessage[]): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured');
      return 'Ошибка: API ключ для ИИ не настроен на сервере.';
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: persona }],
      },
      contents: history, 
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.GEMINI_API_URL}?key=${apiKey}`, payload),
      );
      
      const text = response.data.candidates[0]?.content?.parts[0]?.text;
      return text || 'Я не знаю, что ответить.';

    } catch (error) {
      this.logger.error('Error calling Gemini API', error.response?.data || error.message);
      return 'Произошла ошибка при обращении к ИИ.';
    }
  }
}