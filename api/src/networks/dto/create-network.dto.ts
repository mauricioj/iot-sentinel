import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Matches, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNetworkDto {
  @ApiProperty({ example: 'VLAN 10 - IoT' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4094)
  vlanId?: number;

  @ApiProperty({ example: '192.168.10.0/24' })
  @IsString()
  @Matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, {
    message: 'cidr must be a valid CIDR notation (e.g., 192.168.1.0/24)',
  })
  cidr: string;

  @ApiPropertyOptional({ example: '192.168.10.1' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
