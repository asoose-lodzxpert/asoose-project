import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'chat',
  version: '1',
})
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Send a message' })
  @Post('send')
  async sendMessage(@Request() req, @Body() body: any) {
    return this.chatService.sendMessage({
      senderId: req.user.id,
      senderType: req.user.role,
      ...body,
    });
  }

  @ApiOperation({ summary: 'Get messages with a specific user' })
  @Get('messages/:otherId')
  async getMessages(
    @Request() req,
    @Param('otherId') otherId: string,
    @Query('orderId') orderId?: string,
    @Query('rideId') rideId?: string,
  ) {
    return this.chatService.getMessages({
      userId: req.user.id,
      otherId,
      orderId,
      rideId,
    });
  }

  @ApiOperation({ summary: 'Get active conversations' })
  @Get('conversations')
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.id);
  }

  @ApiOperation({ summary: 'Mark message as read' })
  @Post('read/:id')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.chatService.markAsRead(id, req.user.id);
  }
}
