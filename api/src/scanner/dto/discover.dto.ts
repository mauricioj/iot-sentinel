import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanType } from '../schemas/scan-job.schema';

export class DiscoverDto {
  @ApiProperty({ description: 'Network ID to scan' })
  @IsString()
  networkId: string;

  @ApiPropertyOptional({ enum: ScanType, default: ScanType.DISCOVERY })
  @IsOptional()
  @IsEnum(ScanType)
  type?: ScanType;
}
