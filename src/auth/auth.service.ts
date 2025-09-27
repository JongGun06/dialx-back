// Path: src/auth/auth.service.ts

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginUserDto, RegisterUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { profile: { username: dto.username } }] },
    });
    if (existingUser) {
      throw new ForbiddenException('Пользователь с таким email или username уже существует');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        profile: { create: { username: dto.username } },
        isEmailConfirmed: true,
      },
    });
    // await this.sendConfirmationEmail(user);
    // return { message: 'Регистрация успешна. Пожалуйста, подтвердите ваш email.' };
    return { message: 'Регистрация успешна' };

  }

  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new ForbiddenException('Неверные учетные данные');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new ForbiddenException('Неверные учетные данные');
    
    // if (!user.isEmailConfirmed) throw new ForbiddenException('Пожалуйста, подтвердите ваш email перед входом.');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, hashedRefreshToken: { not: null } },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Вы успешно вышли из системы' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) throw new ForbiddenException('Доступ запрещен');

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!refreshTokenMatches) throw new ForbiddenException('Доступ запрещен');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }
  
  async confirmEmail(token: string) {
    try {
      const payload = await this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      await this.prisma.user.update({
        where: { email: payload.email },
        data: { isEmailConfirmed: true },
      });
      return { message: 'Ваш email успешно подтвержден!' };
    } catch (e) {
      throw new UnauthorizedException('Неверный или просроченный токен подтверждения');
    }
  }

  private async sendConfirmationEmail(user: { email: string }) {
    const token = this.jwtService.sign(
      { email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );
    await this.mailerService.sendConfirmationEmail(user.email, token);
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}