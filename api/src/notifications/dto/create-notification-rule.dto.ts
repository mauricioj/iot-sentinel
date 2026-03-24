import { IsString, IsEnum, IsNumber, IsArray, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetType, RuleCondition } from '../schemas/notification-rule.schema';

export class CreateNotificationRuleDto {
  @ApiProperty({ example: 'Cameras offline > 5min' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: TargetType })
  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiProperty({ enum: RuleCondition })
  @IsEnum(RuleCondition)
  condition: RuleCondition;

  @ApiPropertyOptional({ default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @ApiPropertyOptional({ default: ['in_app'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
