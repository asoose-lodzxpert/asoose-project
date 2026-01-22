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
  private readonly publicBaseUrl: string;

  constructor() {
    const endpoint = process.env.RAILWAY_S3_ENDPOINT;
    const bucket = process.env.RAILWAY_S3_BUCKET;
    const region = process.env.RAILWAY_S3_REGION || 'us-east-1';
    const accessKeyId = process.env.RAILWAY_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.RAILWAY_S3_SECRET_ACCESS_KEY;
    const publicBaseUrl =
      process.env.RAILWAY_S3_PUBLIC_URL ||
      'https://stackable-eclair-kzms-p62.storage.railway.app';

    if (
      !endpoint ||
      !bucket ||
      !accessKeyId ||
      !secretAccessKey ||
      !publicBaseUrl
    ) {
      throw new InternalServerErrorException(
        'Missing Railway S3 env vars. Set RAILWAY_S3_ENDPOINT, RAILWAY_S3_BUCKET, RAILWAY_S3_ACCESS_KEY_ID, RAILWAY_S3_SECRET_ACCESS_KEY, RAILWAY_S3_PUBLIC_URL',
      );
    }

    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // needed for Railway / MinIO
    });
  }

  // =========================
  // Upload single file (public URL)
  // =========================
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    try {
      const key = this.generateKey(file.originalname);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read', // makes the file publicly accessible
        }),
      );

      return { key, url: this.getPublicUrl(key) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to upload file: ${msg}`);
    }
  }

  // =========================
  // Upload multiple files (public URLs)
  // =========================
  async uploadBulk(
    files: Express.Multer.File[],
  ): Promise<{ key: string; url: string }[]> {
    try {
      return await Promise.all(
        files.map(async (file) => {
          const key = this.generateKey(file.originalname);

          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: key,
              Body: file.buffer,
              ContentType: file.mimetype,
              ACL: 'public-read',
            }),
          );

          return { key, url: this.getPublicUrl(key) };
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to upload files: ${msg}`);
    }
  }

  // =========================
  // Delete file by public URL
  // =========================
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to delete file: ${msg}`);
    }
  }

  // =========================
  // Delete file by key
  // =========================
  async deleteFileByKey(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to delete file: ${msg}`);
    }
  }

  // =========================
  // Generate temporary signed URL
  // =========================
  async getSignedUrlForKey(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    try {
      return await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: expiresInSeconds },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${msg}`,
      );
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

  private getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  private extractKeyFromUrl(url: string): string {
    if (!url.startsWith(this.publicBaseUrl)) {
      throw new Error('URL does not match storage public base URL');
    }
    const path = url.replace(this.publicBaseUrl, '');
    const parts = path.split('/').filter(Boolean);

    if (parts[0] !== this.bucket || parts.length < 2) {
      throw new Error('Invalid storage URL format');
    }

    return parts.slice(1).join('/');
  }
}
