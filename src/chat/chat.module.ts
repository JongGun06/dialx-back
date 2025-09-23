// Path: src/chat/chat.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt'; // <-- ИМПОРТИРУЙ ЭТО


@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AiModule,
    forwardRef(() => AuthModule),
    JwtModule.register({}),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatGateway,ChatService],
})
export class ChatModule {}