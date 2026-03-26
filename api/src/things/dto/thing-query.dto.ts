import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus, HealthStatus } from '../schemas/thing.schema';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ThingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() networkId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localId?: string;
  @ApiPropertyOptional({ enum: RegistrationStatus }) @IsOptional() @IsEnum(RegistrationStatus) registrationStatus?: RegistrationStatus;
  @ApiPropertyOptional({ enum: HealthStatus }) @IsOptional() @IsEnum(HealthStatus) healthStatus?: HealthStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}
