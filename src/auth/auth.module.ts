// Path: src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '../mailer/mailer.module';
import { AccessTokenStrategy, RefreshTokenStrategy } from './strategies/index';
@Module({
  imports: [PrismaModule, JwtModule.register({}), ConfigModule, MailerModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy],
})
export class AuthModule {}