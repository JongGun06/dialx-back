// Path: src/chat/chat.controller.ts

import { Controller, Post, Body, UseGuards, Req, Patch, Param, Get, Delete } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/index';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ManageMembersDto } from './dto/manage-members.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';

@UseGuards(AccessTokenGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}


  @Post(':id/messages')
  createMessage(
    @Param('id') chatId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request,
  ) {
    const userId = req.user!.sub;
    return this.chatService.createMessage(dto, chatId, userId);
  }
  
  @Get()
  findAllForUser(@Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.findAllForUser(userId);
  }

  @Get(':id')
  findChatById(@Param('id') chatId: string, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.findChatById(chatId, userId);
  }
  
  @Get(':id/messages')
  findMessagesForChat(@Param('id') chatId: string, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.findMessagesForChat(chatId, userId);
  }
  @Post('private')
  createOrFindPrivateChat(
    @Body() dto: CreatePrivateChatDto,
    @Req() req: Request,
  ) {
    const userId = req.user!.sub;
    return this.chatService.createOrFindPrivateChat(userId, dto.profileId);
  }

  @Post('group')
  createGroupChat(@Body() dto: CreateGroupChatDto, @Req() req: Request) {
    const creatorId = req.user!.sub;
    return this.chatService.createGroupChat(creatorId, dto.profileIds, dto.name, dto.avatarUrl);
  }
  
  @Patch(':id/avatar')
  updateAvatar(@Param('id') chatId: string, @Body() dto: UpdateChatDto, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.updateAvatar(chatId, dto.avatarUrl, userId);
  }

  @Patch(':id/members')
  addMembers(@Param('id') chatId: string, @Body() dto: ManageMembersDto, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.addMembers(chatId, dto.profileIds, userId);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') chatId: string, @Param('memberId') memberProfileId: string, @Req() req: Request) {
    const userId = req.user!.sub;
    return this.chatService.removeMember(chatId, memberProfileId, userId);
  }
}