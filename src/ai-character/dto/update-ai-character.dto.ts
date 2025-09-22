// Path: src/ai-character/dto/update-ai-character.dto.ts

import { IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateAiCharacterDto {
  @IsUrl({}, { message: 'Пожалуйста, предоставьте валидный URL.' })
  @IsNotEmpty()
  avatarUrl: string;
}