import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('super-admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch()
  updateBulk(@Body() body: { settings: { key: string; value: any }[] }) {
    return this.service.updateBulk(body.settings);
  }
}
