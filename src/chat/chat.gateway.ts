// Path: src/chat/chat.gateway.ts

import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(WsJwtGuard)
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private onlineUsers = new Set<string>();
  // Связываем ID сокета с ID пользователя для корректного отключения
  private socketIdToUserId = new Map<string, string>();


  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const userPayload = client.handshake.auth.user;
    const userId = userPayload?.sub;

    if (!userId) {
      this.logger.error(`Unauthenticated connection attempt from socket ${client.id}.`);
      client.disconnect(); // Отключаем неавторизованных пользователей
      return;
    }

    // 1. Отправляем новому клиенту список всех, кто уже онлайн
    client.emit('onlineUsersList', Array.from(this.onlineUsers));

    // 2. Добавляем нового пользователя в наши списки отслеживания
    this.onlineUsers.add(userId);
    this.socketIdToUserId.set(client.id, userId);

    // 3. Рассылаем ВСЕМ ОСТАЛЬНЫМ событие, что этот пользователь теперь онлайн
    client.broadcast.emit('presenceUpdate', { userId, status: 'online' });
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 1. Находим ID пользователя по ID его сокета
    const userId = this.socketIdToUserId.get(client.id);

    if (userId) {
      // 2. Удаляем связку сокет-пользователь
      this.socketIdToUserId.delete(client.id);

      // 3. Проверяем, есть ли у этого пользователя другие активные подключения
      // (например, открыта вкладка в другом браузере или на телефоне)
      const userHasOtherConnections = Array.from(
        this.socketIdToUserId.values(),
      ).includes(userId);

      // 4. Если это было последнее активное подключение, объявляем пользователя оффлайн
      if (!userHasOtherConnections) {
        this.onlineUsers.delete(userId);
        this.server.emit('presenceUpdate', { userId, status: 'offline' });
      }
    }
  }


  @SubscribeMessage('joinRoom')
  handleJoinRoom( @MessageBody() data: string | { chatId: string }, @ConnectedSocket() client: Socket ) {
    const chatId = typeof data === 'object' ? data.chatId : data;
    if (!chatId) { return; }
    client.join(chatId);
    this.logger.log(`Client ${client.id} joined room ${chatId}`);
    client.emit('joinedRoom', chatId);
  }

  @SubscribeMessage('sendMessageToAi')
  async handleAiMessage(
    @MessageBody() data: { characterId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userPayload = client.handshake.auth.user;
    if (!userPayload || !userPayload.sub) { client.emit('error', 'Authentication error.'); return; }

    const profile = await this.prisma.profile.findUnique({ where: { userId: userPayload.sub } });
    if (!profile) { client.emit('error', 'Profile not found.'); return; }
    
    const character = await this.prisma.aiCharacter.findUnique({ where: { id: data.characterId } });
    if (!character) { client.emit('error', 'Персонаж с таким ID не найден.'); return; }

    const dbHistory = await this.prisma.aiMessage.findMany({
      where: { characterId: data.characterId, profileId: profile.id },
      orderBy: { createdAt: 'desc' }, take: 10,
    });
    dbHistory.reverse();

    const history = dbHistory.map(msg => ({
      role: msg.role.toLowerCase() as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    history.push({ role: 'user', parts: [{ text: data.content }] });

    const aiResponse = await this.aiService.getChatCompletion(
      character.persona,
      history,
    );

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: СОХРАНЯЕМ ДИАЛОГ В БД ---
    await this.prisma.aiMessage.createMany({
      data: [
        {
          role: 'USER',
          content: data.content,
          characterId: data.characterId,
          profileId: profile.id,
        },
        {
          role: 'MODEL',
          content: aiResponse,
          characterId: data.characterId,
          profileId: profile.id,
        },
      ],
    });
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    client.emit('aiMessage', {
      characterId: character.id,
      characterName: character.name,
      content: aiResponse,
      createdAt: new Date(),
    });
  }
}