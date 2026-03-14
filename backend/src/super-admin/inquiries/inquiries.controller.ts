import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { InquiriesService } from './inquiries.service';
import { ReplyInquiryDto } from './dto/reply-inquiry.dto';
import { Roles } from 'src/auth/roles.decorator';

@ApiTags('Admin — Inquiries')
@ApiBearerAuth()
@Controller({ path: 'super-admin/inquiries', version: '1' })
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @ApiOperation({ summary: 'Get unread inquiry count' })
  @Get('unread-count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ADMIN_SUPPORT)
  getUnreadCount() {
    return this.inquiriesService.getUnreadCount();
  }

  @ApiOperation({ summary: 'List all inquiries with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['UNREAD', 'READ', 'REPLIED'],
  })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ADMIN_SUPPORT)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.inquiriesService.findAll(page, limit, status);
  }

  @ApiOperation({ summary: 'Get a single inquiry (auto-marks as read)' })
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ADMIN_SUPPORT)
  findOne(@Param('id') id: string) {
    return this.inquiriesService.findOne(id);
  }

  @ApiOperation({ summary: 'Mark inquiry as read' })
  @Patch(':id/read')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ADMIN_SUPPORT)
  markRead(@Param('id') id: string) {
    return this.inquiriesService.markRead(id);
  }

  @ApiOperation({ summary: 'Reply to an inquiry — sends email to the user' })
  @Post(':id/reply')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ADMIN_SUPPORT)
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyInquiryDto,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || req.user?.email || 'Asoose Support';
    return this.inquiriesService.reply(id, dto, adminName);
  }
}
