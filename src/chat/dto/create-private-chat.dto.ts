// Path: src/chat/dto/create-private-chat.dto.ts

import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrivateChatDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID профиля пользователя, с которым создается чат',
  })
  @IsString()
  @IsUUID() // Добавляем проверку, что это валидный UUID
  @IsNotEmpty()
  profileId: string;
}