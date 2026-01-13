import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum VerificationDecision {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class VerifyDocumentDto {
  @IsEnum(VerificationDecision)
  status: VerificationDecision;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
