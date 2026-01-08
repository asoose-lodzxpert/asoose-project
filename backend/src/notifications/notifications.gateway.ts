import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  private activeUsers = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) return client.disconnect();

      const payload = this.jwtService.verify(token, {
          secret: process.env.SUPABASE_JWT_SECRET_KEY 
      });
      const userId = payload.sub || payload.userId;

      client.data.userId = userId;
      
      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      
      this.activeUsers.get(userId)?.add(client.id);

      client.join(`user_${userId}`);
      
      this.logger.log(`Client connected: ${userId}`);
    } catch (err) {
      this.logger.error(`Connection unauthorized: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.activeUsers.has(userId)) {
      const userSockets = this.activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.activeUsers.delete(userId);
        }
      }
    }
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('notification', payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.headers.authorization || client.handshake.auth.token;
    if (!auth) return null;
    return Array.isArray(auth) ? auth[0].replace('Bearer ', '') : auth.replace('Bearer ', '');
  }
}