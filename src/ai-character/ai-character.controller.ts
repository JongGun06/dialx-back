// Path: src/ai-character/ai-character.controller.ts

import { Controller, Post, Body, Get, UseGuards, Req, Patch, Param } from '@nestjs/common';
import { AiCharacterService } from './ai-character.service';
import { CreateAiCharacterDto } from './dto/create-ai-character.dto';
import { AccessTokenGuard } from '../auth/guards/index';
import { Request } from 'express';
import { UpdateAiCharacterDto } from './dto/update-ai-character.dto';

@UseGuards(AccessTokenGuard)
@Controller('ai-characters')
export class AiCharacterController {
  constructor(private readonly aiCharacterService: AiCharacterService) {}

  // --- НОВЫЙ ЭНДПОИНТ: Получение истории сообщений ---
  @Get(':id/messages')
  findMessages(
    @Param('id') characterId: string,
    @Req() req: Request,
  ) {
    const userId = req.user!.sub;
    return this.aiCharacterService.findMessagesForCharacter(characterId, userId);
  }
  // ---------------------------------------------

  @Post()
  create(@Body() dto: CreateAiCharacterDto, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.aiCharacterService.create(dto, userId);
  }

  @Patch(':id/avatar')
  updateAvatar(
    @Param('id') characterId: string,
    @Body() dto: UpdateAiCharacterDto,
    @Req() req: Request,
  ) {
    const userId = req.user!.sub;
    return this.aiCharacterService.updateAvatar(characterId, dto.avatarUrl, userId);
  }

  @Get()
  findAllForUser(@Req() req: Request) {
    const userId = req.user!.sub;
    return this.aiCharacterService.findAllForUser(userId);
  }
}