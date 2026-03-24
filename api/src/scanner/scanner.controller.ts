import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScannerService } from './scanner.service';
import { DiscoverDto } from './dto/discover.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('api/v1/scanner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('discover')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Start a network scan' })
  discover(@Body() dto: DiscoverDto, @CurrentUser('userId') userId: string) {
    return this.scannerService.discover(dto.networkId, dto.type, userId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List scan jobs' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.scannerService.findAll(query.page, query.limit);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get scan job by ID' })
  findOne(@Param('id') id: string) {
    return this.scannerService.findById(id);
  }
}
