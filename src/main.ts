// Path: src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req, res, next) => {
    if (req.originalUrl === '/stripe/webhook') {
      json({
        verify: (req: any, res, buf) => { req.rawBody = buf; },
      })(req, res, next);
    } else {
      json()(req, res, next);
    }
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // --- НАСТРОЙКА SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('DialX Messenger API')
    .setDescription('Полная документация по API для мессенджера DialX')
    .setVersion('1.0')
    .addBearerAuth() // Добавляем кнопку "Authorize" для JWT токенов
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Документация будет доступна по адресу /api
  // -------------------------

  await app.listen(3000);
}
bootstrap();