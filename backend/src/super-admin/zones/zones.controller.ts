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
// Adjust these import paths to match your project structure
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // Adjust path
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';

@Controller('super-admin/zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_MANAGER')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT')
  findAll() {
    return this.zonesService.findAll();
  }

  // --- CRITICAL ENDPOINT ---
  // The Mobile App calls this: /api/super-admin/zones/check?lat=9.0&lng=7.4
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
