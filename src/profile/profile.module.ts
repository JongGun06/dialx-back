// Path: src/profile/profile.module.ts

import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileService } from './profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService], 
})
export class ProfileModule {}