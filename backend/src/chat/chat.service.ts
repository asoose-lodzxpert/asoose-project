import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async sendMessage(dto: {
    senderId: string;
    senderType: UserRole;
    receiverId: string;
    receiverType: UserRole;
    message: string;
    orderId?: string;
    rideId?: string;
  }) {
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        senderId: dto.senderId,
        senderType: dto.senderType,
        receiverId: dto.receiverId,
        receiverType: dto.receiverType,
        message: dto.message,
        orderId: dto.orderId,
        rideId: dto.rideId,
      },
    });

    // Real-time delivery via Socket.io
    // Determine the target room (user_ID or admin_room)
    const targetRoom = dto.receiverType === UserRole.ADMIN || dto.receiverType === UserRole.SUPER_ADMIN
      ? 'admin_room'
      : `user_${dto.receiverId}`;

    this.notificationsGateway.server.to(targetRoom).emit('new_chat_message', chatMessage);

    return chatMessage;
  }

  async getMessages(params: {
    userId: string;
    otherId: string;
    orderId?: string;
    rideId?: string;
  }) {
    return this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: params.userId, receiverId: params.otherId },
          { senderId: params.otherId, receiverId: params.userId },
        ],
        ...(params.orderId && { orderId: params.orderId }),
        ...(params.rideId && { rideId: params.rideId }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsRead(messageId: string, userId: string) {
    return this.prisma.chatMessage.updateMany({
      where: { id: messageId, receiverId: userId },
      data: { isRead: true },
    });
  }

  async getConversations(userId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const conversationsMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherType = msg.senderId === userId ? msg.receiverType : msg.senderType;
      
      const key = `${otherId}_${msg.orderId || msg.rideId || 'general'}`;
      
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          lastMessage: msg,
          otherId,
          otherType,
          orderId: msg.orderId,
          rideId: msg.rideId,
        });
      }
    }

    const results = await Promise.all(
      Array.from(conversationsMap.values()).map(async (conv) => {
        const otherUser = await this.prisma.user.findUnique({
          where: { id: conv.otherId },
          select: { name: true, image: true, phone: true },
        });

        return {
          ...conv,
          otherName: otherUser?.name || (conv.otherId === 'admin' ? 'System Admin' : 'Unknown User'),
          otherAvatar: otherUser?.image || null,
          otherPhone: otherUser?.phone || null,
        };
      }),
    );

    return results;
  }
}
