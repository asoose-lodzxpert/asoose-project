import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Super-Admin / Cities')
@ApiBearerAuth()
@Controller({ path: 'super-admin/cities', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({ summary: 'List all cities with store counts' })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  findAll() {
    return this.citiesService.findAll();
  }

  @ApiOperation({ summary: 'Create a new city' })
  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @ApiOperation({
    summary: 'Toggle a city active/inactive — enables or disables the service area',
  })
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.citiesService.toggle(id);
  }

  @ApiOperation({ summary: 'Delete a city' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
