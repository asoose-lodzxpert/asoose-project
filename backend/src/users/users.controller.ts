import { 
  Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Request 
} from '@nestjs/common';
import { UsersService } from './users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

import { CreateAddressDto } from './dto/create-address.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('orders')
  getOrders(@Request() req) {
    return this.usersService.getOrders(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Delete('profile')
  deleteAccount(@Request() req) {
    return this.usersService.softDeleteAccount(req.user.id);
  }

  @Post('address')
  addAddress(@Request() req, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(req.user.id, dto);
  }

  @Delete('address/:id')
  deleteAddress(@Request() req, @Param('id') addressId: string) {
    return this.usersService.deleteAddress(req.user.id, addressId);
  }



}