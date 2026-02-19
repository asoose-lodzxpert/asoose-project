import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProfileService } from './profile.service';
import { StorageService } from '../../storage/storage.service';
import { UpdatePersonalInfoDto } from '../dto/update-personal-info.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller({
  path: 'rider/profile',
  version: '1',
})
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('me')
  async patchCurrentRider(@Req() req, @Body() updates: UpdatePersonalInfoDto) {
    const { id } = req.user || {};
    return this.profileService.updatePersonalInfo(id, updates);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('me')
  async getCurrentRider(@Req() req) {
    const { id } = req.user || {};
    return this.profileService.getRiderProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('personal-info')
  async getPersonalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.profileService.getPersonalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('personal-info')
  async updatePersonalInfo(
    @Req() req,
    @Body() updateData: UpdatePersonalInfoDto,
  ) {
    const { id } = req.user || {};
    return this.profileService.updatePersonalInfo(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('upload-profile-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const { url: imageUrl } = await this.storageService.uploadFile(file);

    await this.profileService.updateRiderImage(req.user.id, imageUrl);
    return { imageUrl };
  }
}
