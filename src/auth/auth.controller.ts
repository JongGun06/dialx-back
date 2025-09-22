// Path: src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto, LoginUserDto } from './dto';
import { Response, Request } from 'express';
import { AccessTokenGuard, RefreshTokenGuard } from './guards/index';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';


@ApiTags('Auth') 
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Вход пользователя в систему' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth() // Указываем, что нужен Bearer токен
  @ApiOperation({ summary: 'Выход пользователя из системы' })
  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.authService.logout(user.sub);
  }


  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновление пары токенов' })
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Req() req: Request) {
    const user = req.user as { sub: string; refreshToken: string };
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }

  @Get('confirm')
  async confirm(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.authService.confirmEmail(token);
      
      const htmlSuccess = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Подтвержден</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { text-align: center; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
                .icon { color: #28a745; font-size: 50px; width: 70px; height: 70px; }
                h1 { color: #333; margin-top: 20px; }
                p { color: #666; font-size: 1.1em; }
            </style>
        </head>
        <body>
            <div class="container">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
                <h1>Email успешно подтвержден!</h1>
                <p>Теперь вы можете закрыть это окно и войти в приложение.</p>
            </div>
        </body>
        </html>
      `;
      res.header('Content-Type', 'text/html').send(htmlSuccess);
    } catch (error) {
        const htmlError = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ошибка Подтверждения</title>
            <style>
                body { font-family: sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { text-align: center; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
                h1 { color: #dc3545; }
                p { color: #666; font-size: 1.1em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Ошибка подтверждения</h1>
                <p>Ссылка недействительна или срок ее действия истек. Пожалуйста, попробуйте зарегистрироваться снова.</p>
            </div>
        </body>
        </html>
        `;
        res.status(400).header('Content-Type', 'text/html').send(htmlError);
    }
  }
}