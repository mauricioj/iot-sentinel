import { IsString, IsOptional, IsBoolean, ValidateNested, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CapabilitiesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableChannels?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enablePortScan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableCredentials?: boolean;
}

export class CreateThingTypeDto {
  @ApiProperty({ example: 'Camera' })
  @IsString() @MinLength(1) @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'camera' })
  @IsString() @MinLength(1) @MaxLength(50)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be lowercase with hyphens only' })
  slug: string;

  @ApiPropertyOptional({ example: 'camera' })
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional() @IsString()
  color?: string;

  @ApiPropertyOptional({ type: CapabilitiesDto })
  @IsOptional() @ValidateNested() @Type(() => CapabilitiesDto)
  capabilities?: CapabilitiesDto;
}
