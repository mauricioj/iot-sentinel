import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ThingStatus } from '../schemas/thing.schema';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ThingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() networkId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localId?: string;
  @ApiPropertyOptional({ enum: ThingStatus }) @IsOptional() @IsEnum(ThingStatus) status?: ThingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}
