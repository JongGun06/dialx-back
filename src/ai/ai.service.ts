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
  private readonly GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

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
  contents: [
    { role: 'user', parts: [{ text: persona }] }, // persona идёт как первое сообщение от пользователя
    ...history,
  ],
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