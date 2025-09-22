// Path: src/chat/dto/manage-members.dto.ts

import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ManageMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  profileIds: string[];
}