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
    const token = client.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.error('No token provided');
      return false;
    }

    const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!jwtSecret) {
      this.logger.error('JWT_ACCESS_SECRET is not defined in .env file');
      return false;
    }

    try {
      const decoded = verify(token, jwtSecret);
      client.handshake.auth.user = decoded;
      return true;
    } catch (e) {
      this.logger.error(`Token validation failed: ${e.message}`);
      return false;
    }
  }
}