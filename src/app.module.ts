// Path: src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { ProfileModule } from './profile/profile.module';
import { ChatModule } from './chat/chat.module';
import { AiCharacterModule } from './ai-character/ai-character.module';
import { AiModule } from './ai/ai.module';
import { StripeModule } from './stripe/stripe.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MailerModule,
    ProfileModule,
    ChatModule,
    AiCharacterModule,
    AiModule,
    StripeModule,
    FilesModule,
  ],
})
export class AppModule {}