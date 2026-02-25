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
import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RiderStateService } from '../matching/rider-state/rider-state.service';
import { DriverStateService } from '../matching/driver-state/driver-state.service';
import { TokenRevocationService } from '../auth/token-revocation.service';
import { MATCHING_REDIS_CLIENT } from '../matching/redis/redis.module';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

// Per-socket minimum interval between location updates (ms)
const LOCATION_RATE_LIMIT_MS = 800;
// TTL for active job room tracking in Redis (4 hours)
const ACTIVE_ROOM_TTL_SECONDS = 4 * 60 * 60;

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
    private driverStateService: DriverStateService,
    private tokenRevocationService: TokenRevocationService,
    @Inject(MATCHING_REDIS_CLIENT) private readonly matchingRedis: Redis,
  ) {}

  afterInit() {
    // Wire the Redis pub/sub adapter so Socket.IO events are broadcast across
    // all horizontally-scaled instances. We use the ioredis matching client
    // (already connected) and duplicate it — ioredis.duplicate() returns a
    // pre-configured but NOT yet connected client which the adapter connects
    // automatically when it subscribes. This avoids the redis-v4 issue where
    // duplicate() clients must be manually .connect()-ed before use.
    try {
      const pubClient = this.matchingRedis.duplicate();
      const subClient = this.matchingRedis.duplicate();
      this.server.adapter(createAdapter(pubClient, subClient));
      this.logger.log(
        'WebSocket Gateway Initialized with Redis adapter (ioredis)',
      );
    } catch (err) {
      this.logger.warn(
        'WebSocket Redis adapter setup failed — falling back to in-memory adapter. ' +
          'This is safe for single-instance deployments but will NOT work with multiple nodes.',
        err,
      );
    }
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

      // ── Token revocation check ──────────────────────────────────────
      const isRevoked = await this.tokenRevocationService.isUserRevoked(userId);
      if (isRevoked) {
        this.logger.warn(
          `Rejected revoked user ${userId} (Socket: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.data.role = payload.role;

      // Track the user
      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId)?.add(client.id);

      // Join a room specific to this user
      client.join(`user_${userId}`);

      // ── Auto-rejoin active job room on reconnect ─────────────────────
      const activeJobId = await this.matchingRedis.get(
        `socket:${userId}:activeRoom`,
      );
      if (activeJobId) {
        client.join(`order_${activeJobId}`);
        this.logger.log(
          `Auto-rejoined ${userId} to room order_${activeJobId} on reconnect`,
        );
      }

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
   * Allow clients to join a specific order room for tracking.
   * Role-based: admins are always allowed; drivers/riders are allowed only when the
   * requested orderId matches their Redis-persisted active room; customers are allowed
   * (events in the room are benign delivery status updates).
   */
  @SubscribeMessage('joinOrderRoom')
  async handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return { error: 'orderId required' };

    const userId = client.data.userId;
    const role: string = client.data.role ?? '';

    // Admins can join any room
    if (role !== 'SUPER_ADMIN' && role !== 'CUSTOMER') {
      // Drivers / Riders: only allow if the requested room matches their active job
      const activeJobId = await this.matchingRedis
        .get(`socket:${userId}:activeRoom`)
        .catch(() => null);
      if (activeJobId !== data.orderId) {
        this.logger.warn(
          `Unauthorized joinOrderRoom by ${userId} (role=${role}) for order ${data.orderId}`,
        );
        return { error: 'unauthorized' };
      }
    }
    const roomName = `order_${data.orderId}`;
    client.join(roomName);

    // Persist the active job room so reconnects auto-rejoin
    if (userId) {
      await this.matchingRedis.set(
        `socket:${userId}:activeRoom`,
        data.orderId,
        'EX',
        ACTIVE_ROOM_TTL_SECONDS,
      );
    }

    this.logger.log(`User ${userId} joined room: ${roomName}`);
    return { event: 'joinedRoom', room: roomName };
  }

  /**
   * Handle rider location updates via socket
   */
  @SubscribeMessage('rider_location_update')
  async handleRiderLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; role?: string },
  ) {
    const riderId = client.data.userId;
    this.logger.debug(
      `Received location update from socket ${client.id} for user ${riderId} with data: ${JSON.stringify(data)} and native role ${client.data.role}`,
    );
    // JWT-derived role (client.data.role) is authoritative; payload role is only a hint when JWT role is absent
    const role: string = client.data.role || data?.role || 'RIDER';
    if (!riderId) {
      this.logger.warn(`Location update from unauthenticated socket`);
      return { success: false, error: 'Not authenticated' };
    }

    this.logger.debug(
      `Received location update from rider ${riderId}: [${data.lat}, ${data.lng}] with role ${role}`,
    );

    // ── Per-socket rate limit ─────────────────────────────────────
    const now = Date.now();
    if (
      client.data.lastLocationMs &&
      now - client.data.lastLocationMs < LOCATION_RATE_LIMIT_MS
    ) {
      return { success: false, error: 'rate_limited' };
    }
    client.data.lastLocationMs = now;

    if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      this.logger.warn(`Invalid location data from ${riderId}`);
      return { success: false, error: 'Invalid location data' };
    }

    try {
      if (role === 'DRIVER') {
        this.logger.debug(
          `[LOC] Driver ${riderId} → calling driverStateService.updateLocation [${data.lat}, ${data.lng}]`,
        );
        await this.driverStateService.updateLocation(
          riderId,
          data.lat,
          data.lng,
        );
      } else {
        this.logger.debug(
          `[LOC] Rider ${riderId} → calling riderStateService.updateLocation [${data.lat}, ${data.lng}]`,
        );
        await this.riderStateService.updateLocation(
          riderId,
          data.lat,
          data.lng,
        );
      }
      this.logger.debug(
        `Location updated for ${role.toLowerCase()} ${riderId}: [${data.lat}, ${data.lng}]`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error updating location for ${role.toLowerCase()} ${riderId}`,
        error,
      );
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
    data: {
      locations: Array<{ lat: number; lng: number; timestamp: number }>;
      role?: string;
    },
  ) {
    const riderId = client.data.userId;
    const role: string = client.data.role || data?.role || 'RIDER';
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
        if (role === 'DRIVER') {
          await this.driverStateService.updateLocation(
            riderId,
            latest.lat,
            latest.lng,
          );
        } else {
          await this.riderStateService.updateLocation(
            riderId,
            latest.lat,
            latest.lng,
          );
        }
        this.logger.log(
          `Batch location updated for ${role.toLowerCase()} ${riderId} (${data.locations.length} entries)`,
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

  /**
   * Allow admin clients to join the system-wide admin notifications room.
   * Only SUPER_ADMIN sockets are permitted.
   */
  @SubscribeMessage('joinAdminRoom')
  handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
    const role: string = client.data.role ?? '';
    if (role !== 'SUPER_ADMIN') {
      this.logger.warn(
        `Unauthorized joinAdminRoom attempt by ${client.data.userId} (role=${role})`,
      );
      return { error: 'unauthorized' };
    }
    client.join('admin_notifications');
    this.logger.log(
      `Admin ${client.data.userId} joined admin_notifications room`,
    );
    return { event: 'joinedAdminRoom', room: 'admin_notifications' };
  }

  /** Broadcast to all connected super-admin dashboard clients */
  sendToAdminRoom(payload: any) {
    this.server.to('admin_notifications').emit('admin_notification', payload);
  }

  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('notification', payload);
  }

  /**
   * Emit a new dispute message to all parties in the dispute.
   * Each userId in `participantIds` will receive the event on their personal room.
   */
  emitDisputeMessage(participantIds: string[], message: any) {
    for (const uid of participantIds) {
      this.server.to(`user_${uid}`).emit('dispute:message', message);
    }
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
  async joinJobRoom(riderId: string, jobId: string): Promise<void> {
    // Persist so reconnects auto-rejoin — non-fatal if Redis is unavailable
    try {
      await this.matchingRedis.set(
        `socket:${riderId}:activeRoom`,
        jobId,
        'EX',
        ACTIVE_ROOM_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `joinJobRoom: failed to persist room for ${riderId}: ${err?.message}`,
      );
    }

    // Adapter-aware room join: works across all horizontally-scaled instances
    // server.in() routes through the Redis pub/sub adapter unlike the in-memory activeUsers map.
    this.server.in(`user_${riderId}`).socketsJoin(`order_${jobId}`);
    this.logger.log(`Rider ${riderId} joined room: order_${jobId}`);
  }

  /** Clear the active job room key when a job completes or is cancelled */
  async leaveJobRoom(riderId: string): Promise<void> {
    try {
      await this.matchingRedis.del(`socket:${riderId}:activeRoom`);
    } catch {
      // non-fatal
    }
  }

  /**
   * Emit real-time order updates to anyone tracking this order.
   * Only broadcasts to the specific `order_{orderId}` room — NOT globally.
   */
  sendOrderUpdate(orderId: string, payload: any) {
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
