import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RideContactsService } from './ride-contacts.service';
import { CreateRideContactDto, UpdateRideContactDto } from './dto/ride-contact.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Ride Contacts')
@Controller('ride-contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@ApiBearerAuth()
export class RideContactsController {
  constructor(private readonly service: RideContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List saved passenger contacts for the current customer' })
  list(@Req() req) {
    return this.service.list(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new passenger contact' })
  create(@Req() req, @Body() dto: CreateRideContactDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a saved passenger contact' })
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateRideContactDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved passenger contact' })
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
