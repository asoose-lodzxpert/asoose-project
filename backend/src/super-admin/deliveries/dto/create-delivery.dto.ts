import {
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsObject
} from 'class-validator';

export class AdminCreateDeliveryDto {
    @IsString()
    @IsOptional()
    customerId?: string;

    @IsObject()
    pickupLocation: { lat: number; lng: number; address: string };

    @IsObject()
    dropoffLocation: { lat: number; lng: number; address: string };

    @IsString()
    recipientName: string;

    @IsString()
    recipientPhone: string;

    @IsString()
    @IsOptional()
    senderName?: string;

    @IsString()
    @IsOptional()
    senderPhone?: string;

    @IsString()
    packageDetails: string;

    @IsNumber()
    weightKg: number;

    @IsBoolean()
    @IsOptional()
    isFragile?: boolean;

    @IsBoolean()
    @IsOptional()
    isPerishable?: boolean;

    @IsBoolean()
    @IsOptional()
    containsLiquid?: boolean;

    @IsNumber()
    @IsOptional()
    declaredValue?: number;
}
