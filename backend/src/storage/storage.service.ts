import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.bucketName =
      this.configService.get<string>('SUPABASE_BUCKET') || 'asoose-uploads';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = file.originalname.split('.').pop();
      const filename = `${timestamp}-${randomStr}.${extension}`;
      const filepath = `uploads/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filepath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.bucketName).getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = url.split(`${this.bucketName}/`);
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL');
      }
      const filepath = urlParts[1];

      // Delete from Supabase Storage
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filepath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}
