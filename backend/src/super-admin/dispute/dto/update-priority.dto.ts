import { IsEnum } from 'class-validator';
import { DisputePriority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePriorityDto {
  @ApiProperty({ enum: DisputePriority, example: DisputePriority.HIGH })
  @IsEnum(DisputePriority)
  priority: DisputePriority;
}
