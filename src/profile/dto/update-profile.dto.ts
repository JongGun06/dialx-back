// Path: src/profile/dto/update-my-profile.dto.ts

import { IsString, MinLength, IsObject, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Новое имя пользователя',
    example: 'super_user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({
    description: 'Объект с настройками пользователя',
    example: { theme: 'dark_purple' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  settings?: object;

  // --- ДОБАВЛЕНО ЭТО ПОЛЕ ---
  @ApiProperty({
    description: 'Новый URL аватарки, полученный после загрузки на /files/upload',
    example: 'https://your-bucket.s3.amazonaws.com/new-avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Пожалуйста, предоставьте валидный URL.' })
  avatarUrl?: string;
}