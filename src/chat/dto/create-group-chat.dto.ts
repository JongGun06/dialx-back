// Path: src/chat/dto/create-group-chat.dto.ts

import { IsArray, IsString, ArrayMinSize, ArrayNotEmpty, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateGroupChatDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayMinSize(1)
  profileIds: string[];
}