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

    // Users
    const users = await this.prisma.user.findMany({
      select: { fcmToken: true, expoPushToken: true },
      where: {
        OR: [{ fcmToken: { not: null } }, { expoPushToken: { not: null } }],
      },
    });
    for (const u of users) {
      sent += await this._sendPush(u.fcmToken, u.expoPushToken, title, message);
    }

    // Riders & Drivers
    const riders = await this.prisma.rider.findMany({
      select: { fcmToken: true, expoPushToken: true },
      where: {
        OR: [{ fcmToken: { not: null } }, { expoPushToken: { not: null } }],
      },
    });
    for (const r of riders) {
      sent += await this._sendPush(r.fcmToken, r.expoPushToken, title, message);
    }

    // Vendors
    const vendors = await this.prisma.vendor.findMany({
      select: { fcmToken: true, expoPushToken: true },
      where: {
        OR: [{ fcmToken: { not: null } }, { expoPushToken: { not: null } }],
      },
    });
    for (const v of vendors) {
      sent += await this._sendPush(v.fcmToken, v.expoPushToken, title, message);
    }

    return { sent, title, message };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST - Blast a push to all admins
  // ─────────────────────────────────────────────────────────────────────────
  async testAdminPush(title: string, message: string) {
    let sent = 0;
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] as any[] },
        OR: [{ fcmToken: { not: null } }, { expoPushToken: { not: null } }],
      },
      select: { fcmToken: true, expoPushToken: true },
    });

    for (const a of admins) {
      sent += await this._sendPush(a.fcmToken, a.expoPushToken, title, message);
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

    let fcmToken: string | null = null;
    let expoToken: string | null = null;
    let email: string | null = null;
    let name: string | null = null;

    if (entityType === 'USER') {
      const rec = await this.prisma.user.findUnique({
        where: { id: entityId },
        select: {
          fcmToken: true,
          expoPushToken: true,
          email: true,
          name: true,
        },
      });
      fcmToken = rec?.fcmToken ?? null;
      expoToken = rec?.expoPushToken ?? null;
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    } else if (entityType === 'RIDER' || entityType === 'DRIVER') {
      const rec = await this.prisma.rider.findUnique({
        where: { id: entityId },
        select: {
          fcmToken: true,
          expoPushToken: true,
          email: true,
          name: true,
        },
      });
      fcmToken = rec?.fcmToken ?? null;
      expoToken = rec?.expoPushToken ?? null;
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    } else if (entityType === 'VENDOR') {
      const rec = await this.prisma.vendor.findUnique({
        where: { id: entityId },
        select: {
          fcmToken: true,
          expoPushToken: true,
          email: true,
          name: true,
        },
      });
      fcmToken = rec?.fcmToken ?? null;
      expoToken = rec?.expoPushToken ?? null;
      email = rec?.email ?? null;
      name = rec?.name ?? null;
    }

    let pushSent = false;
    let emailQueued = false;

    if (sendPush) {
      const count = await this._sendPush(fcmToken, expoToken, title, message);
      pushSent = count > 0;
    }

    if (sendEmail && email) {
      await this.emailProducer.sendAdminNoticeEmail(
        email,
        name ?? 'User',
        title,
        message,
      );
      emailQueued = true;
    }

    return { pushSent, emailQueued, entityId, entityType };
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
      if (type === 'USER') {
        const records = await this.prisma.user.findMany({
          select: {
            fcmToken: true,
            expoPushToken: true,
            email: true,
            name: true,
          },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (sendPush)
            pushCount += await this._sendPush(
              rec.fcmToken,
              rec.expoPushToken,
              title,
              message,
            );
          if (sendEmail && rec.email) {
            await this.emailProducer.sendAdminNoticeEmail(
              rec.email,
              rec.name ?? 'User',
              title,
              message,
            );
            emailCount++;
          }
        });
      } else if (type === 'RIDER' || type === 'DRIVER') {
        const roleFilter = type === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER;
        const records = await this.prisma.rider.findMany({
          where: { role: roleFilter },
          select: {
            fcmToken: true,
            expoPushToken: true,
            email: true,
            name: true,
          },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (sendPush)
            pushCount += await this._sendPush(
              rec.fcmToken,
              rec.expoPushToken,
              title,
              message,
            );
          if (sendEmail && rec.email) {
            await this.emailProducer.sendAdminNoticeEmail(
              rec.email,
              rec.name ?? 'User',
              title,
              message,
            );
            emailCount++;
          }
        });
      } else if (type === 'VENDOR') {
        const records = await this.prisma.vendor.findMany({
          select: {
            fcmToken: true,
            expoPushToken: true,
            email: true,
            name: true,
          },
        });
        await this._inBatches(records, 50, async (rec) => {
          if (sendPush)
            pushCount += await this._sendPush(
              rec.fcmToken,
              rec.expoPushToken,
              title,
              message,
            );
          if (sendEmail && rec.email) {
            await this.emailProducer.sendAdminNoticeEmail(
              rec.email,
              rec.name ?? 'User',
              title,
              message,
            );
            emailCount++;
          }
        });
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
  ): Promise<number> {
    let count = 0;
    try {
      if (expoToken) {
        await this.expo.sendToDevice(expoToken, title, body, {});
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
