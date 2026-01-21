import {
  Controller,
  Post,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPG, and PNG are allowed',
      );
    }

    const result = await this.storageService.uploadFile(file);
    return { url: result.signedUrl };
  }

  @Post('upload-public')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPublicFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPG, and PNG are allowed',
      );
    }

    const result = await this.storageService.uploadFile(file);
    return { url: result.signedUrl };
  }

  @Post('upload-bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadBulk(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate file size and type for each file
    const MAX_SIZE = 5 * 1024 * 1024;
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    const validFiles: Express.Multer.File[] = [];
    const errors: { index: number; message: string }[] = [];

    files.forEach((file, index) => {
      if (file.size > MAX_SIZE) {
        errors.push({
          index,
          message: `File ${file.originalname} exceeds 5MB limit`,
        });
      } else if (!allowedTypes.includes(file.mimetype)) {
        errors.push({
          index,
          message: `File ${file.originalname} has invalid type`,
        });
      } else {
        validFiles.push(file);
      }
    });

    // Upload all valid files
    const results = await this.storageService.uploadBulk(validFiles);

    // Extract just the URLs (signedUrl) from results
    const urls = results.map((result) => result.signedUrl);

    return {
      urls,
      totalFiles: files.length,
      uploadedFiles: validFiles.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  @Post('upload-public')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFilePublic(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type - only documents for signup
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPG, and PNG are allowed',
      );
    }

    const result = await this.storageService.uploadFile(file);
    return { url: result.signedUrl };
  }

  @Delete('delete')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('No URL provided');
    }

    await this.storageService.deleteFile(body.url);
    return { message: 'File deleted successfully' };
  }
}
