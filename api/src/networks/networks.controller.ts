import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NetworksService } from './networks.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Networks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Post('api/v1/locals/:localId/networks')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a network in a local' })
  create(@Param('localId') localId: string, @Body() dto: CreateNetworkDto) {
    return this.networksService.create(localId, dto);
  }

  @Get('api/v1/locals/:localId/networks')
  @ApiOperation({ summary: 'List networks in a local' })
  findByLocal(@Param('localId') localId: string, @Query() query: PaginationQueryDto) {
    return this.networksService.findByLocalId(localId, query.page, query.limit);
  }

  @Get('api/v1/networks')
  @ApiOperation({ summary: 'List all networks across all locals' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.networksService.findAll(query.page, query.limit);
  }

  @Get('api/v1/networks/:id')
  @ApiOperation({ summary: 'Get network by ID' })
  findOne(@Param('id') id: string) {
    return this.networksService.findById(id);
  }

  @Patch('api/v1/networks/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a network' })
  update(@Param('id') id: string, @Body() dto: UpdateNetworkDto) {
    return this.networksService.update(id, dto);
  }

  @Delete('api/v1/networks/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a network' })
  remove(@Param('id') id: string) {
    return this.networksService.delete(id);
  }
}
