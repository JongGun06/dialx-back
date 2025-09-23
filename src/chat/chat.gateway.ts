// Path: src/chat/chat.gateway.ts

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { verify } from 'jsonwebtoken';
import { ChatService } from './chat.service';

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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ChatService)) 
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket & { user?: any }) {
    this.logger.log(`Client connected: ${client.id}. Performing authentication...`);

    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('No token provided');
      }

      const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT_ACCESS_SECRET is not configured');
      }

      const decoded = verify(token, jwtSecret);
      client.user = decoded; // Прикрепляем пользователя к сокету
      const userId = client.user?.sub;

      if (!userId) {
        throw new Error('User ID not found in token payload');
      }

      this.logger.log(`Client ${client.id} authenticated successfully. User ID: ${userId}`);
      
      // Логика системы присутствия
      client.emit('onlineUsersList', Array.from(this.onlineUsers));
      this.onlineUsers.add(userId);
      this.socketIdToUserId.set(client.id, userId);
      client.broadcast.emit('presenceUpdate', { userId, status: 'online' });

    } catch (e) {
      this.logger.warn(`Authentication failed for client ${client.id}: ${e.message}`);
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Сначала ищем в auth (правильный способ для клиентов)
    const fromAuth = client.handshake.auth?.token;
    if (fromAuth) {
      return fromAuth;
    }

    const fromHeaders = client.handshake.headers?.authorization;
    if (fromHeaders && fromHeaders.startsWith('Bearer ')) {
      return fromHeaders.split(' ')[1];
    }
    
    return undefined;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = this.socketIdToUserId.get(client.id); 
    if (userId) {
      this.socketIdToUserId.delete(client.id);
      const userHasOtherConnections = Array.from(this.socketIdToUserId.values()).includes(userId);
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
    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    const userId = (client as any).user?.sub;
    if (!userId) { 
      client.emit('error', 'Authentication error.'); 
      return; 
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId: userId } });
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
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
    
    await this.prisma.aiMessage.createMany({
      data: [
        { role: 'USER', content: data.content, characterId: data.characterId, profileId: profile.id },
        { role: 'MODEL', content: aiResponse, characterId: data.characterId, profileId: profile.id },
      ],
    });

    client.emit('aiMessage', {
      characterId: character.id,
      characterName: character.name,
      content: aiResponse,
      createdAt: new Date(),
    });
  }
}