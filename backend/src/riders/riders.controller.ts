import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  Patch,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Sse,
  MessageEvent,
  Request,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RidersService } from './riders.service';
import { RidersStreamService } from './riders-stream.service';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateRiderStatusDto } from './dto/update-status.dto';
import { AcceptDeliveryDto } from './dto/accept-delivery.dto';
import { CompleteDeliveryDto } from './dto/complete-delivery.dto';
import { StorageService } from '../storage/storage.service';

@Controller('riders')
export class RidersController {
  constructor(
    private readonly ridersService: RidersService,
    private readonly storageService: StorageService,
    private readonly streamService: RidersStreamService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('me')
  async getCurrentRider(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getRiderProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Sse('stream')
  streamEvents(@Request() req): Observable<MessageEvent> {
    const riderId = req.user.id;
    return this.streamService.getRiderStream(riderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('status')
  async updateStatus(@Req() req, @Body() dto: UpdateRiderStatusDto) {
    const { id } = req.user || {};
    return this.ridersService.updateRiderStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('deliveries/accept')
  async acceptDelivery(@Req() req, @Body() dto: AcceptDeliveryDto) {
    const { id } = req.user || {};
    return this.ridersService.acceptDelivery(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('deliveries/:id/pickup')
  async confirmPickup(@Req() req, @Query('deliveryId') deliveryId: string) {
    const { id } = req.user || {};
    return this.ridersService.confirmPickup(id, deliveryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('deliveries/complete')
  async completeDelivery(@Req() req, @Body() dto: CompleteDeliveryDto) {
    const { id } = req.user || {};
    return this.ridersService.completeDelivery(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('deliveries/active')
  async getActiveDelivery(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getActiveDelivery(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('wallet/balance')
  async getWalletBalance(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getWalletBalance(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('earnings')
  async getEarnings(
    @Req() req,
    @Query('timeframe') timeframe: string = 'week',
  ) {
    const { id } = req.user || {};
    return this.ridersService.getEarnings(id, timeframe);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('bank-account')
  async getBankAccount(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getBankAccount(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('bank-account')
  async updateBankAccount(
    @Req() req,
    @Body() updateData: UpdateBankAccountDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updateBankAccount(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('notification-settings')
  async getNotificationSettings(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getNotificationSettings(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('notification-settings')
  async updateNotificationSettings(
    @Req() req,
    @Body() updateData: UpdateNotificationSettingsDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updateNotificationSettings(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('personal-info')
  async getPersonalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getPersonalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('personal-info')
  async updatePersonalInfo(
    @Req() req,
    @Body() updateData: UpdatePersonalInfoDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updatePersonalInfo(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('upload-profile-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPG and PNG images are allowed',
      );
    }

    // Upload file to storage
    const result = await this.storageService.uploadFile(file);

    // Update rider's image field
    const { id } = req.user || {};
    await this.ridersService.updateRiderImage(id, result.signedUrl);

    return { imageUrl: result.signedUrl };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('withdrawal-info')
  async getWithdrawalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getWithdrawalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('withdraw')
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.requestWithdrawal(id, createWithdrawalDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('orders/history')
  async getOrdersHistory(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { id } = req.user || {};
    return this.ridersService.getOrdersHistory(
      id,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
