// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middleware для Stripe Webhook
  app.use(
    json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl.startsWith('/stripe/webhook')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  // Используем порт из окружения (от Render) или 3000 по умолчанию
  const port = process.env.PORT || 3000;
  
  // Обязательно добавляем '0.0.0.0', чтобы сервер был доступен извне
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`Application is running on port: ${port}`);
}
bootstrap();