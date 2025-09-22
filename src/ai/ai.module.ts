// Path: src/ai/ai.module.ts (Вариант Б, без прокси)

import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    // Просто регистрируем модуль с таймаутом
    HttpModule.register({
      timeout: 15000, // 15 секунд
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}