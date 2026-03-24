import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThingsService } from './things.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Things')
@ApiBearerAuth()
@Controller('api/v1/things')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThingsController {
  constructor(private readonly thingsService: ThingsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new thing' })
  create(@Body() dto: CreateThingDto) {
    return this.thingsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List things with filters' })
  findAll(@Query() query: ThingQueryDto) {
    return this.thingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get thing by ID (credentials decrypted)' })
  findOne(@Param('id') id: string) {
    return this.thingsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a thing' })
  update(@Param('id') id: string, @Body() dto: UpdateThingDto) {
    return this.thingsService.update(id, dto);
  }

  @Delete('discovered')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete all discovered (unregistered) things' })
  deleteDiscovered() {
    return this.thingsService.deleteByStatus('discovered');
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a thing' })
  remove(@Param('id') id: string) {
    return this.thingsService.delete(id);
  }
}
