// Path: src/stripe/stripe.module.ts

import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule], 
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}