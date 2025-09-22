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

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) { this.logger.log(`Client connected: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Client disconnected: ${client.id}`); }

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