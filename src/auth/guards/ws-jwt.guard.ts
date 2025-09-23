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
    this.logger.log('--- WebSocket Guard: Starting authentication ---'); // <-- Новый лог

    const client: Socket & { user?: any } = context.switchToWs().getClient<Socket>();
    
    try {
      // 1. Извлекаем токен
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`[FAIL] No token found. Disconnecting client ${client.id}.`); // <-- Новый лог
        client.disconnect(true);
        return false;
      }
      this.logger.log(`[OK] Token found for client ${client.id}.`); // <-- Новый лог

      // 2. Проверяем наличие секрета на сервере
      const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!jwtSecret) {
        this.logger.error('[FAIL] JWT_ACCESS_SECRET is not configured on the server!'); // <-- Новый лог
        client.disconnect(true);
        return false;
      }
      this.logger.log('[OK] JWT secret key is configured.'); // <-- Новый лог

      // 3. Валидируем токен
      const decoded = verify(token, jwtSecret);
      client.user = decoded; // Прикрепляем пользователя к сокету
      
      this.logger.log(`[SUCCESS] Client ${client.id} authenticated successfully. User ID: ${decoded.sub}`); // <-- Новый лог
      return true; // Успех!

    } catch (e) {
      this.logger.warn(`[FAIL] Token validation failed for client ${client.id}: ${e.message}`); // <-- Новый лог
      client.disconnect(true);
      return false;
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Сначала ищем в auth (правильный способ для клиентов)
    const fromAuth = client.handshake.auth?.token;
    if (fromAuth) {
      this.logger.log('Token extracted from handshake.auth.token'); // <-- Новый лог
      return fromAuth;
    }

    // Потом в headers (запасной способ для тестов)
    const fromHeaders = client.handshake.headers?.authorization;
    if (fromHeaders && fromHeaders.startsWith('Bearer ')) {
      this.logger.log('Token extracted from handshake.headers.authorization'); // <-- Новый лог
      return fromHeaders.split(' ')[1];
    }
    
    return undefined;
  }
} 