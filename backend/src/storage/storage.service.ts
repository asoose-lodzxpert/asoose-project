import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class StorageService {
  private storageType: 'local' | 's3' | 'cloudinary';
  private storagePath: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.storageType =
      this.configService.get<'local' | 's3' | 'cloudinary'>('STORAGE_TYPE') ||
      'local';
    this.storagePath =
      this.configService.get<string>('STORAGE_PATH') || './uploads';
    this.baseUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    // Create uploads directory if it doesn't exist (for local storage)
    if (this.storageType === 'local' && !existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = file.originalname.split('.').pop();
      const filename = `${timestamp}-${randomStr}.${extension}`;

      if (this.storageType === 'local') {
        return await this.uploadToLocal(file, filename);
      } else if (this.storageType === 's3') {
        return await this.uploadToS3(file, filename);
      } else if (this.storageType === 'cloudinary') {
        return await this.uploadToCloudinary(file, filename);
      }

      throw new Error('Invalid storage type');
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    const filepath = path.join(this.storagePath, filename);
    await fs.writeFile(filepath, file.buffer);
    return `${this.baseUrl}/uploads/${filename}`;
  }

  private async uploadToS3(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    // If you want to use S3, uncomment this code and install aws-sdk:
    // npm install @aws-sdk/client-s3

    /*
    import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
    
    const s3Client = new S3Client({
      region: this.configService.get<string>('AWS_S3_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });

    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const key = `uploads/${filename}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return `https://${bucket}.s3.${this.configService.get<string>('AWS_S3_REGION')}.amazonaws.com/${key}`;
    */

    throw new Error(
      'S3 storage is not configured. Please install @aws-sdk/client-s3 and uncomment the code.',
    );
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    // If you want to use Cloudinary, uncomment this code and install cloudinary:
    // npm install cloudinary

    /*
    import { v2 as cloudinary } from 'cloudinary';

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'asoose-uploads', public_id: filename },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(file.buffer);
    });
    */

    throw new Error(
      'Cloudinary storage is not configured. Please install cloudinary and uncomment the code.',
    );
  }

  async deleteFile(url: string): Promise<void> {
    try {
      if (this.storageType === 'local') {
        const filename = url.split('/').pop();
        if (!filename) {
          throw new Error('Invalid file URL');
        }
        const filepath = path.join(this.storagePath, filename);

        if (existsSync(filepath)) {
          await fs.unlink(filepath);
        }
      } else if (this.storageType === 's3') {
        // Implement S3 deletion if needed
        throw new Error('S3 deletion not implemented');
      } else if (this.storageType === 'cloudinary') {
        // Implement Cloudinary deletion if needed
        throw new Error('Cloudinary deletion not implemented');
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}
