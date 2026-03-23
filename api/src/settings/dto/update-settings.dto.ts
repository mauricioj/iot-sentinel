import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class BackupSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  retention?: number;
}

class MonitorSettingsDto {
  @ApiPropertyOptional({ description: 'Seconds between ping sweeps', default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  statusCheckInterval?: number;
}

class ScannerSettingsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentScans?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  cooldownSeconds?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instanceName?: string;

  @ApiPropertyOptional({ enum: ['pt-BR', 'en-US'] })
  @IsOptional()
  @IsEnum(['pt-BR', 'en-US'])
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BackupSettingsDto)
  backup?: BackupSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MonitorSettingsDto)
  monitor?: MonitorSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ScannerSettingsDto)
  scanner?: ScannerSettingsDto;
}
