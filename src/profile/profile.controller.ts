// Path: src/profile/profile.controller.ts

import { Controller, Get, Req, UseGuards, Query, Patch, Body } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/index';
import { Request } from 'express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';


@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @Get('me')
  getMyProfile(@Req() req: Request) {
    const userId = req.user!.sub;
    return this.profileService.findByUserId(userId);
  }

  @ApiOperation({ summary: 'Обновление профиля текущего пользователя (имя, настройки)' })
  @Patch('me')
  updateMyProfile(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.profileService.updateMyProfile(userId, dto);
  }

  @ApiOperation({ summary: 'Обновление аватарки текущего пользователя' })
  @Patch('me/avatar')
  updateMyAvatar(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.profileService.updateAvatar(userId, dto.avatarUrl || "");
  }

  @ApiOperation({ summary: 'Поиск пользователей по имени' })
  @ApiQuery({ name: 'q', required: false, description: 'Часть имени пользователя для поиска' })
  @Get('search')
  searchProfiles(@Query('q') query: string = '', @Req() req: Request) {
    const userId = req.user!.sub;
    return this.profileService.search(query, userId);
  }
}