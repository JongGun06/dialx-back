// Path: src/chat/dto/create-message.dto.ts

import { IsOptional, IsString, IsUrl, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}