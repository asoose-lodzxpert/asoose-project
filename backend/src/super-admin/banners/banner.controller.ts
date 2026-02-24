import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import {
  CreateBannerDto,
  UpdateBannerDto,
  ReorderBannersDto,
} from './dto/create-banner.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Super-Admin / Banners')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/banners',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @ApiOperation({ summary: 'List all banners' })
  @Get()
  findAll() {
    return this.bannersService.findAll();
  }

  @ApiOperation({ summary: 'Get a single banner by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new banner (with optional image upload)' })
  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(FileInterceptor('image')) // Intercept 'image' field
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannersService.create(createBannerDto, file);
  }

  @ApiOperation({
    summary: 'Reorder banners by providing an ordered array of IDs',
  })
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  reorder(@Body() reorderDto: ReorderBannersDto) {
    return this.bannersService.reorder(reorderDto.ids);
  }

  @ApiOperation({ summary: 'Update a banner (with optional new image)' })
  @ApiConsumes('multipart/form-data')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannersService.update(id, updateBannerDto, file);
  }

  @ApiOperation({ summary: 'Delete a banner' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
