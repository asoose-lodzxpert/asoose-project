import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName = 'uploads'; 

constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env config');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  async deleteFile(publicUrl: string) {
    if (!publicUrl) return;

    try {
      const parts = publicUrl.split(`/${this.bucketName}/`);
      if (parts.length < 2) return; 

      const path = parts[1]; // e.g., "vendor-images/1709823.png"

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) throw error;

      this.logger.log(`Deleted old image: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${publicUrl}`, error.stack);
    }
  }
}