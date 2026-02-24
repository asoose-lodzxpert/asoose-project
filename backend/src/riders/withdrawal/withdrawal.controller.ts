import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Withdrawal')
@ApiBearerAuth()
@Controller({
  path: 'rider/withdrawal',
  version: '1',
})
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @ApiOperation({
    summary: 'Get rider wallet and bank account info for withdrawal',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('info')
  async getWithdrawalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.withdrawalService.getWithdrawalInfo(id);
  }

  @ApiOperation({ summary: 'Request a wallet withdrawal to bank account' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('request')
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { id } = req.user || {};
    return this.withdrawalService.requestWithdrawal(id, createWithdrawalDto);
  }
}
