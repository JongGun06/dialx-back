// Path: src/profile/profile.service.ts

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}


  async findByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      // Расширяем запрос: теперь мы запрашиваем не только
      // данные профиля, но и связанные с ним данные пользователя.
      select: {
        id: true,
        username: true,
        settings: true, // <-- ДОБАВЛЕНО ПОЛЕ SETTINGS В ВЫБОРКУ
        avatarUrl: true,
        user: {
          // Из данных пользователя нам нужно только поле subscriptionStatus
          select: {
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Профиль не найден');
    }

    // Преобразуем объект, чтобы ответ был "плоским" и удобным для фронтенда
    const { user, ...profileData } = profile;

    return {
      ...profileData, // id, username, avatarUrl
      subscriptionStatus: user.subscriptionStatus, // 'FREE', 'ACTIVE', etc.
    };
  }
  // Path: src/profile/profile.service.ts

async updateMyProfile(userId: string, dto: UpdateProfileDto) {
  // 1. Проверка уникальности имени (если оно было передано)
  if (dto.username) {
    const existingProfile = await this.prisma.profile.findUnique({
      where: { username: dto.username },
    });
    if (existingProfile && existingProfile.userId !== userId) {
      throw new ForbiddenException('Это имя пользователя уже занято.');
    }
  }

  // 2. Создаем пустой объект для данных, которые нужно обновить
  const dataToUpdate: Prisma.ProfileUpdateInput = {};

  // 3. Добавляем поля в объект, ТОЛЬКО ЕСЛИ они существуют в DTO.
  //    Это и есть проверка, которая решает ошибку TypeScript.
  if (dto.username !== undefined) {
    dataToUpdate.username = dto.username;
  }
  if (dto.avatarUrl !== undefined) {
    // Ошибки не будет, так как мы уже убедились, что avatarUrl не undefined
    dataToUpdate.avatarUrl = dto.avatarUrl;
  }

  // 4. "Умное" обновление настроек
  if (dto.settings) {
    const currentProfile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { settings: true },
    });
    const currentSettings = (currentProfile?.settings as object) || {};
    dataToUpdate.settings = { ...currentSettings, ...dto.settings };
  }

  // 5. Обновляем данные в БД одним запросом
  return this.prisma.profile.update({
    where: { userId },
    data: dataToUpdate,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      settings: true,
    },
  });
}

  async search(query: string, currentUserId: string) {
    return this.prisma.profile.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        NOT: { userId: currentUserId },
      },
      select: { id: true, username: true, avatarUrl: true },
      take: 10,
    });
  }

  // --- НОВЫЙ МЕТОД ---
  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
    });
  }
}