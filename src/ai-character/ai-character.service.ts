// Path: src/ai-character/ai-character.service.ts

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiCharacterDto } from './dto/create-ai-character.dto';

@Injectable()
export class AiCharacterService {
  constructor(private prisma: PrismaService) {}

  async findMessagesForCharacter(characterId: string, currentUserId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });
    if (!profile) throw new NotFoundException('Ваш профиль не найден');

    const character = await this.prisma.aiCharacter.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Персонаж не найден');

    // Проверяем, что пользователь является создателем персонажа
    if (character.creatorProfileId !== profile.id) {
      throw new ForbiddenException('Вы не можете просматривать историю чужого персонажа');
    }

    const messages = await this.prisma.aiMessage.findMany({
      where: {
        characterId: characterId,
        profileId: profile.id,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    // Приводим ответ к формату, который будет удобен фронтенду
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      // Вместо role отдаем понятный объект author
      author: msg.role === 'USER'
        ? { id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl }
        : { id: character.id, username: character.name, avatarUrl: character.avatarUrl },
    }));
  }

  async create(dto: CreateAiCharacterDto, creatorUserId: string) {
    const profileWithUserAndCount = await this.prisma.profile.findUnique({
      where: { userId: creatorUserId },
      include: { user: true, _count: { select: { aiCharacters: true } } },
    });
    if (!profileWithUserAndCount || !profileWithUserAndCount.user) {
      throw new NotFoundException('Профиль или пользователь не найдены');
    }
    const characterCount = profileWithUserAndCount._count.aiCharacters;
    const subscriptionStatus = profileWithUserAndCount.user.subscriptionStatus;
    if (subscriptionStatus === 'FREE' && characterCount >= 1) {
      throw new ForbiddenException('Бесплатные пользователи могут создать только 1 персонажа.');
    }
    if (subscriptionStatus === 'ACTIVE' && characterCount >= 5) {
      throw new ForbiddenException('Достигнут лимит в 5 персонажей.');
    }
    return this.prisma.aiCharacter.create({
      data: {
        name: dto.name, persona: dto.persona, avatarUrl: dto.avatarUrl,
        creatorProfileId: profileWithUserAndCount.id,
      },
    });
  }

  async findAllForUser(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Профиль пользователя не найден');
    return this.prisma.aiCharacter.findMany({
      where: { creatorProfileId: profile.id },
    });
  }

  // --- НОВЫЙ МЕТОД ---
  async updateAvatar(characterId: string, avatarUrl: string, currentUserId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: currentUserId } });
    if (!profile) throw new NotFoundException('Ваш профиль не найден');

    const character = await this.prisma.aiCharacter.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Персонаж не найден');

    if (character.creatorProfileId !== profile.id) {
      throw new ForbiddenException('Вы не можете изменять чужого персонажа');
    }

    return this.prisma.aiCharacter.update({
      where: { id: characterId },
      data: { avatarUrl },
    });
  }
}