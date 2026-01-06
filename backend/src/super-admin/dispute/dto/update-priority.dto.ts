import { IsEnum } from 'class-validator';
import { DisputePriority } from '@prisma/client';

export class UpdatePriorityDto {
  @IsEnum(DisputePriority)
  priority: DisputePriority;
}
