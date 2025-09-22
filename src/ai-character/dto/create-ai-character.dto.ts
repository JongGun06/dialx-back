// Path: src/ai-character/dto/create-ai-character.dto.ts

import { IsNotEmpty, IsString, MinLength, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAiCharacterDto {
  @ApiProperty({ example: 'Шерлок Холмс', description: 'Имя персонажа' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'Ты - Шерлок Холмс, гениальный детектив...',
    description: 'Подробное описание характера и стиля общения персонажа',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  persona: string;

  @ApiProperty({
    required: false,
    description: 'URL аватарки, полученный после загрузки на /files/upload',
    example: 'https://your-bucket.s3.amazonaws.com/sherlock.jpg',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}