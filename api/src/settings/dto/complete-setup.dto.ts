import { IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteSetupDto {
  @ApiProperty({ enum: ['pt-BR', 'en-US'] })
  @IsEnum(['pt-BR', 'en-US'])
  language: string;

  @ApiProperty()
  @IsString()
  instanceName: string;

  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  adminUsername: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  adminPassword: string;
}
