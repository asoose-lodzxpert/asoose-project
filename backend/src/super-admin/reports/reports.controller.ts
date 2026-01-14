import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsService, AnalyticsReport } from './reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('/super-admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<AnalyticsReport> {
    if (days < 1 || days > 365)
      throw new BadRequestException('Days must be between 1 and 365');
    return this.analyticsService.getAnalyticsReport(days);
  }

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (days < 1 || days > 365)
      throw new BadRequestException('Days must be between 1 and 365');
    const report = await this.analyticsService.getAnalyticsReport(days);
    return { overview: report.overview, avgRating: report.avgRating };
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getRevenue(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (days < 1 || days > 365)
      throw new BadRequestException('Days must be between 1 and 365');
    const report = await this.analyticsService.getAnalyticsReport(days);
    return {
      breakdown: report.revenueBreakdown,
      daily: report.orderVolume,
      totalRevenue: report.overview.totalRevenue,
    };
  }

  @Get('growth')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getGrowth() {
    const report = await this.analyticsService.getAnalyticsReport(30);
    return { growth: report.growth };
  }

  @Get('top-vendors')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getTopVendors(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (days < 1 || days > 365)
      throw new BadRequestException('Days must be between 1 and 365');
    const report = await this.analyticsService.getAnalyticsReport(days);
    return { vendors: report.topVendors.slice(0, limit) };
  }

  @Get('ratings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getRatings() {
    const report = await this.analyticsService.getAnalyticsReport(30);
    return { distribution: report.ratings, average: report.avgRating };
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="analytics-report.csv"')
  async exportAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<StreamableFile> {
    if (days < 1 || days > 365)
      throw new BadRequestException('Days must be between 1 and 365');
    const csv = await this.analyticsService.exportAnalyticsToCSV(days);
    const buffer = Buffer.from(csv, 'utf-8');
    return new StreamableFile(buffer);
  }
}
