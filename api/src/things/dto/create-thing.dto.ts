import {
  IsString, IsOptional, IsArray, IsNumber, IsObject, IsEnum,
  MinLength, MaxLength, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelDirection, ChannelType } from '../schemas/thing.schema';

class PortDto {
  @ApiProperty() @IsNumber() @Min(1) @Max(65535) port: number;
  @ApiPropertyOptional({ default: 'tcp' }) @IsOptional() @IsString() protocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() service?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}

class ChannelDto {
  @ApiProperty() @IsNumber() number: number;
  @ApiProperty({ enum: ChannelDirection }) @IsEnum(ChannelDirection) direction: ChannelDirection;
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiPropertyOptional({ enum: ChannelType }) @IsOptional() @IsEnum(ChannelType) type?: ChannelType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
}

class CredentialsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() username?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateThingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() networkId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  groupIds?: string[];

  @ApiProperty({ example: 'Camera Garagem' })
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'camera' })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsOptional() @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional() @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  hostname?: string;

  @ApiPropertyOptional({ example: 'Hikvision' })
  @IsOptional() @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'Linux 5.4' })
  @IsOptional() @IsString()
  os?: string;

  @ApiPropertyOptional({ example: 'Front door IP camera' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [PortDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PortDto)
  ports?: PortDto[];

  @ApiPropertyOptional({ type: [ChannelDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChannelDto)
  channels?: ChannelDto[];

  @ApiPropertyOptional({ type: CredentialsDto })
  @IsOptional() @ValidateNested() @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}
