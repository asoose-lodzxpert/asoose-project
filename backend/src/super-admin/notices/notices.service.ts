import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailProducer } from 'src/mail/email.producer';
import { FcmService } from 'src/libs/fcm/fcm.service';
import { ExpoPushService } from 'src/libs/expo/expo-push.service';
import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export type EntityType = 'USER' | 'RIDER' | 'DRIVER' | 'VENDOR';
export type Channel = 'push' | 'email' | 'both';

const ENTITY_TYPES: EntityType[] = ['USER', 'RIDER', 'DRIVER', 'VENDOR'];
const CHANNELS: Channel[] = ['push', 'email', 'both'];

export class SendNoticeDto {
  @IsOptional()
  @IsIn(ENTITY_TYPES)
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsIn(CHANNELS)
  channels: Channel;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class MarketingEmailDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsOptional()
  @IsArray()
  @IsIn(ENTITY_TYPES, { each: true })
  recipientTypes?: EntityType[];
}

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
    private readonly fcm: FcmService,
    private readonly expo: ExpoPushService,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST – blast a push to everyone
  // ─────────────────────────────────────────────────────────────────────────
  async testBroadcastAll(title: string, message: string) {
    let sent = 0;

    const tokens = await this.prisma.pushToken.findMany({
      select: { token: true, platform: true, riderId: true, userId: true, vendorId: true },
    });

    for (const t of tokens) {
      const channelId = (t.riderId) ? 'rides' : 'default';
      const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken[');
      
      if (isExpo) {
        await this.expo.sendToDevice(t.token, title, message, {}, channelId);
        sent++;
      } else {
        await this.fcm.sendToDevice(t.token, title, message, {});
        sent++;
      }
    }

    return { sent, title, message };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST - Blast a push to all admins
  // ─────────────────────────────────────────────────────────────────────────
  async testAdminPush(title: string, message: string) {
    let sent = 0;
    const adminTokens = await this.prisma.pushToken.findMany({
      where: {
        user: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] as any[] },
        },
      },
      select: { token: true, platform: true },
    });

    for (const t of adminTokens) {
      const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken[');
      if (isExpo) {
        await this.expo.sendToDevice(t.token, title, message, {});
        sent++;
      } else {
        await this.fcm.sendToDevice(t.token, title, message, {});
        sent++;
      }
    }
    return { sent, title, message };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send to a SINGLE entity
  // ─────────────────────────────────────────────────────────────────────────
  async sendToEntity(dto: SendNoticeDto & { entityId: string }) {
    const { entityType, entityId, channels, title, message } = dto;

    const sendPush = channels === 'push' || channels === 'both';
    const sendEmail = channels === 'email' || channels === 'both';

    let email: string | null = null;
    let name: string | null = null;

    if (entityType === 'USER') {
      const rec = await this.prisma.user.findUnique({
        where: { id: entityId },
        select: { email: true, name: true },
      });
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    } else if (entityType === 'RIDER' || entityType === 'DRIVER') {
      const rec = await this.prisma.rider.findUnique({
        where: { id: entityId },
        select: { email: true, name: true },
      });
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    } else if (entityType === 'VENDOR') {
      const rec = await this.prisma.vendor.findUnique({
        where: { id: entityId },
        select: { email: true, name: true },
      });
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    }

    let pushSentCount = 0;
    if (sendPush) {
      const where: any = {};
      if (entityType === 'USER') where.userId = entityId;
      else if (entityType === 'RIDER' || entityType === 'DRIVER') where.riderId = entityId;
      else if (entityType === 'VENDOR') where.vendorId = entityId;

      const tokens = await this.prisma.pushToken.findMany({ where });
      const channelId = (entityType === 'RIDER' || entityType === 'DRIVER') ? 'rides' : 'default';

      for (const t of tokens) {
        const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken[');
        if (isExpo) {
          await this.expo.sendToDevice(t.token, title, message, {}, channelId);
          pushSentCount++;
        } else {
          await this.fcm.sendToDevice(t.token, title, message, {});
          pushSentCount++;
        }
      }
    }

    let emailQueued = false;
    if (sendEmail && email) {
      await this.emailProducer.sendAdminNoticeEmail(
        email,
        name ?? 'User',
        title,
        message,
      );
      emailQueued = true;
    }

    return { pushSent: pushSentCount > 0, pushCount: pushSentCount, emailQueued, entityId, entityType };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Broadcast to ALL entities of a type (or all types when entityType omitted)
  // ─────────────────────────────────────────────────────────────────────────
  async broadcastToType(dto: SendNoticeDto) {
    const { entityType, channels, title, message } = dto;
    const sendPush = channels === 'push' || channels === 'both';
    const sendEmail = channels === 'email' || channels === 'both';

    let pushCount = 0;
    let emailCount = 0;

    const types: EntityType[] =
      entityType === 'USER'
        ? ['USER']
        : entityType === 'RIDER'
          ? ['RIDER']
          : entityType === 'DRIVER'
            ? ['DRIVER']
            : entityType === 'VENDOR'
              ? ['VENDOR']
              : ['USER', 'RIDER', 'DRIVER', 'VENDOR'];

    for (const type of types) {
      // 1. Handle Push
      if (sendPush) {
        const where: any = {};
        if (type === 'USER') where.userId = { not: null };
        else if (type === 'RIDER' || type === 'DRIVER') {
          where.rider = { role: type === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER };
        }
        else if (type === 'VENDOR') where.vendorId = { not: null };

        const tokens = await this.prisma.pushToken.findMany({ where });
        const channelId = (type === 'RIDER' || type === 'DRIVER') ? 'rides' : 'default';

        for (const t of tokens) {
          const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken[');
          try {
            if (isExpo) {
              await this.expo.sendToDevice(t.token, title, message, {}, channelId);
              pushCount++;
            } else {
              await this.fcm.sendToDevice(t.token, title, message, {});
              pushCount++;
            }
          } catch (e) {
            this.logger.warn(`Failed broadcast push to token ${t.token}: ${e.message}`);
          }
        }
      }

      // 2. Handle Email
      if (sendEmail) {
        if (type === 'USER') {
          const records = await this.prisma.user.findMany({ select: { email: true, name: true } });
          await this._inBatches(records, 50, async (rec) => {
            if (rec.email) {
              await this.emailProducer.sendAdminNoticeEmail(rec.email, rec.name ?? 'User', title, message);
              emailCount++;
            }
          });
        } else if (type === 'RIDER' || type === 'DRIVER') {
          const roleFilter = type === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER;
          const records = await this.prisma.rider.findMany({ where: { role: roleFilter }, select: { email: true, name: true } });
          await this._inBatches(records, 50, async (rec) => {
            if (rec.email) {
              await this.emailProducer.sendAdminNoticeEmail(rec.email, rec.name ?? 'User', title, message);
              emailCount++;
            }
          });
        } else if (type === 'VENDOR') {
          const records = await this.prisma.vendor.findMany({ select: { email: true, name: true } });
          await this._inBatches(records, 50, async (rec) => {
            if (rec.email) {
              await this.emailProducer.sendAdminNoticeEmail(rec.email, rec.name ?? 'User', title, message);
              emailCount++;
            }
          });
        }
      }
    }

    return { pushCount, emailCount, entityType, title };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Marketing email – broadcast raw HTML template
  // ─────────────────────────────────────────────────────────────────────────
  async broadcastMarketingEmail(dto: MarketingEmailDto) {
    const types: EntityType[] = dto.recipientTypes ?? [
      'USER',
      'RIDER',
      'DRIVER',
      'VENDOR',
    ];
    const { subject, htmlContent } = dto;
    let queued = 0;

    for (const type of types) {
      if (type === 'USER') {
        const records = await this.prisma.user.findMany({
          select: { email: true, name: true },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (rec.email) {
            await this.emailProducer.sendMarketingEmail(
              rec.email,
              rec.name ?? 'User',
              subject,
              htmlContent,
            );
            queued++;
          }
        });
      } else if (type === 'RIDER' || type === 'DRIVER') {
        const roleFilter = type === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER;
        const records = await this.prisma.rider.findMany({
          where: { role: roleFilter },
          select: { email: true, name: true },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (rec.email) {
            await this.emailProducer.sendMarketingEmail(
              rec.email,
              rec.name ?? 'User',
              subject,
              htmlContent,
            );
            queued++;
          }
        });
      } else if (type === 'VENDOR') {
        const records = await this.prisma.vendor.findMany({
          select: { email: true, name: true },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (rec.email) {
            await this.emailProducer.sendMarketingEmail(
              rec.email,
              rec.name ?? 'User',
              subject,
              htmlContent,
            );
            queued++;
          }
        });
      }
    }

    return { queued, subject };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Run async tasks over an array in parallel batches of `size`. */
  private async _inBatches<T>(
    items: T[],
    size: number,
    fn: (item: T) => Promise<void>,
  ) {
    for (let i = 0; i < items.length; i += size) {
      await Promise.all(items.slice(i, i + size).map(fn));
    }
  }

  private async _sendPush(
    fcmToken: string | null | undefined,
    expoToken: string | null | undefined,
    title: string,
    body: string,
    channelId = 'default',
  ): Promise<number> {
    let count = 0;
    try {
      if (expoToken) {
        await this.expo.sendToDevice(expoToken, title, body, {}, channelId);
        count++;
      }
      if (fcmToken) {
        await this.fcm.sendToDevice(fcmToken, title, body, {});
        count++;
      }
    } catch (err) {
      this.logger.warn(`Push failed: ${err?.message ?? err}`);
    }
    return count;
  }
}
