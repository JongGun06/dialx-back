// Path: src/chat/chat.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async findAllForUser(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Профиль не найден');
    }

    const chats = await this.prisma.chat.findMany({
      where: { participants: { some: { profileId: profile.id } } },
      include: {
        participants: {
          select: { profile: { select: { id: true, username: true, avatarUrl: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    // Исправляем логику трансформации.
    // Теперь isGroup определяется СТРОГО по полю `type`.
    return chats.map((chat) => {
      const { type, ...rest } = chat;
      return {
        ...rest,
        isGroup: type === 'GROUP',
      };
    });
  }

  async createMessage(dto: CreateMessageDto, chatId: string, senderUserId: string) {
    if (!dto.content && !dto.fileUrl) {
      throw new BadRequestException('Сообщение не может быть пустым.');
    }
    const { profile } = await this.validateChatMembership(chatId, senderUserId);
    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: profile.id,
        content: dto.content,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
    const messageForClient = {
      id: message.id,
      content: message.content,
      fileUrl: message.fileUrl,
      fileType: message.fileType,
      createdAt: message.createdAt,
      author: message.sender, // Включаем информацию об авторе
    };
    this.chatGateway.server.to(chatId).emit('newMessage', messageForClient);
    return messageForClient;
  }
  
  async findMessagesForChat(chatId: string, currentUserId: string) {
    await this.validateChatMembership(chatId, currentUserId);
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map(msg => ({
      id: msg.id, content: msg.content, fileUrl: msg.fileUrl,
      fileType: msg.fileType, createdAt: msg.createdAt, author: msg.sender,
    }));
  }
  
  private async validateChatMembership(chatId: string, userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Ваш профиль не найден');
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, participants: { some: { profileId: profile.id } } },
    });
    if (!chat) throw new ForbiddenException('Вы не состоите в этом чате или он не существует');
    return { profile, chat };
  }

  async addMembers(chatId: string, memberProfileIds: string[], currentUserId: string) {
    await this.validateChatMembership(chatId, currentUserId);
    const newMembers = await this.prisma.profile.findMany({ where: { id: { in: memberProfileIds } } });
    if (newMembers.length !== memberProfileIds.length) { throw new BadRequestException('Один или несколько приглашенных пользователей не найдены.'); }
    await this.prisma.chatParticipant.createMany({
      data: memberProfileIds.map(profileId => ({ chatId, profileId })),
      skipDuplicates: true,
    });
    return this.prisma.chat.findUnique({ where: { id: chatId }, include: { participants: { include: { profile: true } } } });
  }

  async findChatById(chatId: string, currentUserId: string) {
    // Проверка прав доступа остается прежней
    await this.validateChatMembership(chatId, currentUserId);

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        // Запрос к БД не меняется, он правильный
        participants: {
          select: {
            profile: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    
    if (!chat) {
        throw new NotFoundException('Чат не найден');
    }
    
    // --- Вот ключевое исправление: ---
    // 1. Деструктурируем ответ от Prisma, чтобы отделить участников
    const { type, participants, ...rest } = chat;

    // 2. Создаем новый, "плоский" массив участников, извлекая данные из `p.profile`
    const formattedParticipants = participants.map(p => p.profile);

    // 3. Возвращаем объект с правильной структурой
    return {
      ...rest, // id, name, avatarUrl чата и т.д.
      isGroup: type === 'GROUP',
      participants: formattedParticipants, // Теперь здесь плоский массив профилей
    };
  }

  async createOrFindPrivateChat(creatorUserId: string, otherProfileId: string) {
    const creatorProfile = await this.prisma.profile.findUnique({
      where: { userId: creatorUserId },
      select: { id: true },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Ваш профиль не найден');
    }

    if (creatorProfile.id === otherProfileId) {
      throw new BadRequestException('Вы не можете создать чат с самим собой.');
    }

    // Ищем существующий личный чат между этими двумя пользователями
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'PRIVATE',
        // Условие, что ОБА пользователя являются участниками
        AND: [
          { participants: { some: { profileId: creatorProfile.id } } },
          { participants: { some: { profileId: otherProfileId } } },
        ],
      },
    });

    // Если чат найден, возвращаем его данные
    if (existingChat) {
      // Используем уже существующий метод, чтобы формат ответа был консистентным
      return this.findChatById(existingChat.id, creatorUserId);
    }

    // Если чат не найден, создаем новый
    const newChat = await this.prisma.chat.create({
      data: {
        type: 'PRIVATE',
        participants: {
          create: [
            { profileId: creatorProfile.id },
            { profileId: otherProfileId },
          ],
        },
      },
    });

    // И возвращаем данные нового чата в том же формате
    return this.findChatById(newChat.id, creatorUserId);
  }

  
  async removeMember(chatId: string, memberProfileId: string, currentUserId: string) {
    await this.validateChatMembership(chatId, currentUserId);
    return this.prisma.chatParticipant.delete({ where: { chatId_profileId: { chatId, profileId: memberProfileId } } });
  }
  async createGroupChat(creatorUserId: string, memberProfileIds: string[], name: string, avatarUrl?: string) {
    const creatorProfile = await this.prisma.profile.findUnique({ where: { userId: creatorUserId } });
    if (!creatorProfile) { throw new NotFoundException('Профиль создателя не найден'); }
    const members = await this.prisma.profile.findMany({ where: { id: { in: memberProfileIds } } });
    if (members.length !== memberProfileIds.length) { throw new BadRequestException('Один или несколько приглашенных пользователей не найдены.'); }
    const allIdsWithDuplicates = [creatorProfile.id, ...memberProfileIds];
    const uniqueParticipantIds = [...new Set(allIdsWithDuplicates)];
    return this.prisma.chat.create({
      data: { name, avatarUrl, type: 'GROUP', participants: { create: uniqueParticipantIds.map(profileId => ({ profileId })) } },
      include: { participants: { include: { profile: true } } },
    });
  }
  async updateAvatar(chatId: string, avatarUrl: string, currentUserId: string) {
    await this.validateChatMembership(chatId, currentUserId);
    return this.prisma.chat.update({ where: { id: chatId }, data: { avatarUrl } });
  }
}