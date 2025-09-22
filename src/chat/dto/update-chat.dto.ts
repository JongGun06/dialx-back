// Path: src/chat/dto/update-chat.dto.ts

import { IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateChatDto {
  @IsUrl({}, { message: 'Пожалуйста, предоставьте валидный URL.' })
  @IsNotEmpty()
  avatarUrl: string;
}