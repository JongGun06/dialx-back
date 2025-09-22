// Path: src/auth/guards/ws-jwt.guard.ts

import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Unauthenticated connection attempt from socket ${client.id}. No token provided.`);
      client.disconnect(true);
      return false;
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

      // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
      // Добавляем проверку, что секретный ключ загружен из .env
      if (!jwtSecret) {
        this.logger.error('JWT_ACCESS_SECRET is not configured on the server. Disconnecting client.');
        client.disconnect(true);
        return false;
      }
      // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

      // Теперь TypeScript уверен, что jwtSecret - это строка
      const decoded = verify(token, jwtSecret);
      client.handshake.auth.user = decoded;
      return true;

    } catch (e) {
      this.logger.warn(`Token validation failed for socket ${client.id}: ${e.message}. Disconnecting client.`);
      client.disconnect(true);
      return false;
    }
  }

  private extractToken(client: Socket): string | undefined {
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
}