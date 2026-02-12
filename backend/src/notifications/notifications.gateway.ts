import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RiderStateService } from '../matching/rider-state/rider-state.service';

// Explicit CORS configuration for Socket.IO
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

  constructor(
    private jwtService: JwtService,
    private riderStateService: RiderStateService,
  ) {}

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

      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET not configured');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
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

  /**
   * Allow clients to join a specific order room for tracking
   */
  @SubscribeMessage('joinOrderRoom')
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data && data.orderId) {
      const roomName = `order_${data.orderId}`;
      client.join(roomName);
      this.logger.log(`User ${client.data.userId} joined room: ${roomName}`);
      return { event: 'joinedRoom', room: roomName };
    }
  }

  /**
   * Handle rider location updates via socket
   */
  @SubscribeMessage('rider_location_update')
  async handleRiderLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    const riderId = client.data.userId;
    if (!riderId) {
      this.logger.warn(`Location update from unauthenticated socket`);
      return { success: false, error: 'Not authenticated' };
    }

    if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      this.logger.warn(`Invalid location data from ${riderId}`);
      return { success: false, error: 'Invalid location data' };
    }

    try {
      await this.riderStateService.updateLocation(riderId, data.lat, data.lng);
      this.logger.debug(
        `Location updated for rider ${riderId}: [${data.lat}, ${data.lng}]`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating location for rider ${riderId}`, error);
      return { success: false, error: 'Failed to update location' };
    }
  }

  /**
   * Handle batch location updates (for offline queue flush)
   */
  @SubscribeMessage('rider_location_batch')
  async handleRiderLocationBatch(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { locations: Array<{ lat: number; lng: number; timestamp: number }> },
  ) {
    const riderId = client.data.userId;
    if (!riderId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!data || !Array.isArray(data.locations)) {
      return { success: false, error: 'Invalid batch data' };
    }

    try {
      // Process only the most recent location from the batch
      const sorted = data.locations.sort((a, b) => b.timestamp - a.timestamp);
      const latest = sorted[0];

      if (
        latest &&
        typeof latest.lat === 'number' &&
        typeof latest.lng === 'number'
      ) {
        await this.riderStateService.updateLocation(
          riderId,
          latest.lat,
          latest.lng,
        );
        this.logger.log(
          `Batch location updated for rider ${riderId} (${data.locations.length} entries)`,
        );
      }

      return { success: true, processed: data.locations.length };
    } catch (error) {
      this.logger.error(
        `Error processing location batch for rider ${riderId}`,
        error,
      );
      return { success: false, error: 'Failed to process batch' };
    }
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('notification', payload);
  }

  sendToVendor(vendorId: string, payload: any) {
    this.server.to(`user_${vendorId}`).emit('notification', payload);
  }

  sendToRider(riderId: string, payload: any) {
    this.server.to(`user_${riderId}`).emit('notification', payload);
  }

  /**
   * Emit job assignment event to a specific rider
   */
  emitJobAssigned(riderId: string, jobData: any) {
    this.logger.log(`Emitting job.assigned to rider ${riderId}`);
    this.server.to(`user_${riderId}`).emit('job.assigned', jobData);
  }

  /**
   * Emit job update event to a specific rider
   */
  emitJobUpdated(riderId: string, jobData: any) {
    this.logger.log(`Emitting job.updated to rider ${riderId}`);
    this.server.to(`user_${riderId}`).emit('job.updated', jobData);
  }

  /**
   * Emit job cancellation event to a specific rider
   */
  emitJobCancelled(riderId: string, jobData: any) {
    this.logger.log(`Emitting job.cancelled to rider ${riderId}`);
    this.server.to(`user_${riderId}`).emit('job.cancelled', jobData);
  }

  /**
   * Join a rider to an order/ride room for real-time updates
   */
  joinJobRoom(riderId: string, jobId: string) {
    // Find all sockets for this rider and join them to the room
    const userSockets = this.activeUsers.get(riderId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`order_${jobId}`);
          this.logger.log(`Rider ${riderId} joined room: order_${jobId}`);
        }
      });
    }
  }

  /**
   * Emit real-time order updates to anyone tracking this order
   */
  sendOrderUpdate(orderId: string, payload: any) {
    // 1. Emit to the specific event listener expected by frontend hooks
    this.server.emit(`order_update_${orderId}`, payload);

    // 2. Also emit to the standard room for scalability
    this.server.to(`order_${orderId}`).emit('order_update', payload);
  }

  private extractToken(client: Socket): string | null {
    // 1. Check Handshake Auth (Standard Socket.IO v4) - PRIORITIZE THIS FOR RIDER APP
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. Fallback to Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    // 3. Fallback to query parameter
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }
}
