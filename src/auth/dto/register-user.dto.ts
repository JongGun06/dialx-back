// Path: src/auth/dto/register-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ example: 'test@example.com', description: 'Уникальный email пользователя' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
  @ApiProperty({ example: 'my_username', description: 'Уникальное имя пользователя' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Password123!', description: 'Пароль (мин. 8 символов, 1 цифра, 1 заглавная буква)' })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Пароль слишком слабый',
  })
  password: string;
}