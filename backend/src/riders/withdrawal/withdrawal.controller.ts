import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';

@Controller('riders/withdrawal')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('info')
  async getWithdrawalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.withdrawalService.getWithdrawalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('request')
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { id } = req.user || {};
    return this.withdrawalService.requestWithdrawal(id, createWithdrawalDto);
  }
}
