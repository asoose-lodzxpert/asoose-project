import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guards';
import { UserRole } from '../common/enums/user-role.enum';
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';

// ─── Allowed MIME types + their magic-byte signatures ──────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
] as const;

async function assertSafeMimeType(file: Express.Multer.File): Promise<void> {
  // Magic-byte inspection — catches files renamed to a different extension
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(file.buffer);

  // `detected` is undefined for plain-text / unrecognised formats
  if (!detected || !ALLOWED_TYPES.includes(detected.mime as any)) {
    throw new BadRequestException(
      `Invalid file type. Detected: ${detected?.mime ?? 'unknown'}`,
    );
  }

  // Override the client-provided mimetype with the detected one.
  // This is crucial because React Native FormData often sends 'application/octet-stream'
  // when appending blobs, which would otherwise fail strict type checks or upload to S3
  // with the wrong Content-Type.
  file.mimetype = detected.mime;
}

@ApiTags('Storage')
@Controller({
  path: 'storage',
  version: '1',
})
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: 'Admin: list all files in storage bucket' })
  @ApiBearerAuth()
  @Post('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listFiles() {
    const files = await this.storageService.listFiles();
    return { files };
  }

  @ApiOperation({ summary: 'Upload a single file (PDF, JPG, PNG, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
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

    // Validate file type — checks both client-supplied mimetype AND magic bytes
    await assertSafeMimeType(file);

    const result = await this.storageService.uploadFile(file);
    return { url: result.url };
  }

  @ApiOperation({
    summary: 'Upload a single file without authentication (public)',
  })
  @ApiConsumes('multipart/form-data')
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

    // Validate file type — checks both client-supplied mimetype AND magic bytes
    await assertSafeMimeType(file);

    const result = await this.storageService.uploadFile(file);
    return { url: result.url };
  }

  @ApiOperation({
    summary: 'Upload up to 10 files at once (max 5MB each, auth required)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @Post('upload-bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadBulk(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate file size and type for each file
    const MAX_SIZE = 5 * 1024 * 1024;

    const validFiles: Express.Multer.File[] = [];
    const errors: { index: number; message: string }[] = [];

    for (const [index, file] of files.entries()) {
      if (file.size > MAX_SIZE) {
        errors.push({
          index,
          message: `File ${file.originalname} exceeds 5MB limit`,
        });
      } else {
        try {
          // Magic-byte + mimetype check for each file
          await assertSafeMimeType(file);
          validFiles.push(file);
        } catch {
          errors.push({
            index,
            message: `File ${file.originalname} has invalid or mismatched type`,
          });
        }
      }
    }

    // Upload all valid files
    const results = await this.storageService.uploadBulk(validFiles);

    // Extract just the URLs (signedUrl) from results
    const urls = results.map((result) => result.url);

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

    // Validate file type — checks both client-supplied mimetype AND magic bytes
    await assertSafeMimeType(file);

    const result = await this.storageService.uploadFile(file);
    return { url: result.url };
  }

  @ApiOperation({ summary: 'Delete a file by URL (auth required)' })
  @ApiBearerAuth()
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
