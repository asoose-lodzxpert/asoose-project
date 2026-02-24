import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VerificationDecision {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class VerifyDocumentDto {
  @ApiProperty({
    enum: VerificationDecision,
    example: VerificationDecision.VERIFIED,
  })
  @IsEnum(VerificationDecision)
  status: VerificationDecision;

  @ApiPropertyOptional({ example: 'Document is blurry and unreadable' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
