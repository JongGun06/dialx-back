// Path: src/ai-character/ai-character.module.ts

import { Module } from '@nestjs/common';
import { AiCharacterService } from './ai-character.service';
import { AiCharacterController } from './ai-character.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiCharacterController],
  providers: [AiCharacterService],
})
export class AiCharacterModule {}  