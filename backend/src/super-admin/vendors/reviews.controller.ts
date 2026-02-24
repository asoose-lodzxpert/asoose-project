import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Vendors')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/vendors',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({
    summary: 'Get paginated customer reviews for a vendor store',
  })
  @Get(':storeId/reviews')
  async getVendorReviews(
    @Param('storeId') storeId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getVendorReviews(storeId, page, limit);
  }
}
