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

// ✅ FIX: Explicit CORS configuration for Socket.IO
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : ['http://localhost:3001', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  // Map to track active sockets per user: userId -> Set<socketId>
  private activeUsers = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Connection attempt without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });
      
      const userId = payload.sub || payload.userId;

      client.data.userId = userId;

      // Track the user
      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId)?.add(client.id);

      // Join a room specific to this user
      client.join(`user_${userId}`);

      this.logger.log(`Client connected: ${userId} (Socket: ${client.id})`);
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

  // Vendors and Riders likely share the same User ID system in your DB, 
  // but if they have distinct "Vendor IDs" vs "User IDs", keep these methods.
  // Otherwise, sendToUser works for all of them if they are in the 'user_{id}' room.
  
  sendToVendor(vendorId: string, payload: any) {
    this.server.to(`user_${vendorId}`).emit('notification', payload);
  }

  sendToRider(riderId: string, payload: any) {
    this.server.to(`user_${riderId}`).emit('notification', payload);
  }

  private extractToken(client: Socket): string | null {
    // 1. Check Handshake Auth (Standard Socket.IO v4)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }
}