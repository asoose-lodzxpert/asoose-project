import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const publicBaseUrl = this.configService.get<string>('AWS_S3_PUBLIC_URL');

    if (
      !bucket ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !publicBaseUrl
    ) {
      throw new InternalServerErrorException(
        'Missing AWS S3 env vars. Set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_PUBLIC_URL',
      );
    }

    this.bucket = bucket;
    this.region = region;
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');

    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
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
  async deleteFile(fileUrlOrKey: string): Promise<void> {
    try {
      let key = fileUrlOrKey;
      if (fileUrlOrKey.startsWith('http')) {
        key = this.extractKeyFromUrl(fileUrlOrKey);
      }
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to delete file: ${msg}`);
    }
  }

  // =========================
  // Helpers
  // =========================

  // Keep generateKey method for unique file names
  private generateKey(originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const ext = originalName.split('.').pop() || 'bin';
    return `uploads/${timestamp}-${randomStr}.${ext}`;
  }

  // FIX: Changed from private to public
  public getPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
  }

  // =========================
  // List all files in the bucket (public URLs)
  // =========================
  async listFiles(): Promise<{ key: string; url: string }[]> {
    try {
      const files: { key: string; url: string }[] = [];
      let ContinuationToken: string | undefined = undefined;
      do {
        const response = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            ContinuationToken,
          }),
        );
        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key) {
              files.push({ key: obj.Key, url: this.getPublicUrl(obj.Key) });
            }
          }
        }
        ContinuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (ContinuationToken);
      return files;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to list files: ${msg}`);
    }
  }

  private extractKeyFromUrl(url: string): string {
    // Remove the public base URL from the start
    if (!url.startsWith(this.publicBaseUrl)) {
      throw new Error('URL does not match storage public base URL');
    }
    let key = url.replace(this.publicBaseUrl, '');
    if (key.startsWith('/')) key = key.slice(1);
    return key;
  }
}
