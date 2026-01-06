import { Controller, Get, Post, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admins.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

@Controller('super-admin/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @Roles('SUPER_ADMIN') 
  create(@Body() createAdminDto: CreateAdminDto, @Req() req) {
    return this.adminsService.create(createAdminDto, req.user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN') 
  findAll() {
    return this.adminsService.findAll();
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.adminsService.remove(id, req.user.id);
  }
}