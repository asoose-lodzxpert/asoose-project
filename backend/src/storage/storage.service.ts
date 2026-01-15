import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.RAILWAY_S3_ENDPOINT;
    const bucket = process.env.RAILWAY_S3_BUCKET;
    const region = process.env.RAILWAY_S3_REGION || 'us-east-1';
    const accessKeyId = process.env.RAILWAY_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.RAILWAY_S3_SECRET_ACCESS_KEY;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'Missing Railway S3 env vars. Set RAILWAY_S3_ENDPOINT, RAILWAY_S3_BUCKET, RAILWAY_S3_ACCESS_KEY_ID, RAILWAY_S3_SECRET_ACCESS_KEY',
      );
    }

    this.bucket = bucket;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  // =========================
  // Upload single + signed URL
  // =========================
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ key: string; signedUrl: string }> {
    try {
      const key = this.generateKey(file.originalname);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const signedUrl = await this.getSignedGetUrl(key);

      return { key, signedUrl };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to upload file: ${msg}`);
    }
  }

  // =========================
  // Upload bulk + signed URLs
  // =========================
  async uploadBulk(
    files: Express.Multer.File[],
  ): Promise<{ key: string; signedUrl: string }[]> {
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const key = this.generateKey(file.originalname);

          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: key,
              Body: file.buffer,
              ContentType: file.mimetype,
            }),
          );

          const signedUrl = await this.getSignedGetUrl(key);

          return { key, signedUrl };
        }),
      );

      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to upload files: ${msg}`);
    }
  }

  // =========================
  // Delete by FULL URL
  // =========================
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to delete file: ${msg}`);
    }
  }


  // =========================
  // Delete by KEY (recommended)
  // =========================
  async deleteFileByKey(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to delete file: ${msg}`);
    }
  }

  // =========================
  // Generate signed URL later
  // =========================
  async getSignedUrlForKey(
    key: string,
    expiresInSeconds = 60 * 60,
  ): Promise<string> {
    try {
      return await this.getSignedGetUrl(key, expiresInSeconds);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to sign url: ${msg}`);
    }
  }

  // =========================
  // Helpers
  // =========================

  private generateKey(originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const ext = originalName.split('.').pop() || 'bin';
    return `uploads/${timestamp}-${randomStr}.${ext}`;
  }

  private async getSignedGetUrl(
    key: string,
    expiresIn = 60 * 60,
  ): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn },
    );
  }

    private extractKeyFromUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // pathname = /bucket-name/uploads/xxx.png
      const parts = parsed.pathname.split('/').filter(Boolean);

      const bucketIndex = parts.indexOf(this.bucket);

      if (bucketIndex === -1 || bucketIndex + 1 >= parts.length) {
        throw new Error('Invalid Railway storage URL');
      }

      // everything after bucket name is the key
      return parts.slice(bucketIndex + 1).join('/');
    } catch {
      throw new Error('Invalid file URL format');
    }
  }

}
