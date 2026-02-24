import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Adjust path
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Zones')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/zones',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @ApiOperation({ summary: 'Create a new service zone' })
  @Post()
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @ApiOperation({ summary: 'List all service zones' })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  findAll() {
    return this.zonesService.findAll();
  }

  @ApiOperation({
    summary:
      'Check if a lat/lng point is within a service zone (used by mobile apps)',
  })
  @Get('check')
  async checkCoverage(@Query('lat') lat: string, @Query('lng') lng: string) {
    const zones = await this.zonesService.findAll();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Find all zones that contain this point
    const matchedZones = zones.filter(
      (zone) =>
        zone.isActive &&
        this.zonesService.checkLocation(
          latitude,
          longitude,
          zone.coordinates as any[],
        ),
    );

    return {
      isCovered: matchedZones.length > 0,
      activeZones: matchedZones.map((z) => ({
        name: z.name,
        multiplier: z.basePriceMultiplier,
      })),
    };
  }

  @ApiOperation({ summary: 'Get a zone by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update zone properties (name, coordinates, multiplier, etc.)',
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @ApiOperation({ summary: 'Delete a service zone' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
