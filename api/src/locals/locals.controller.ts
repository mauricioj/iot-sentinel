import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocalsService } from './locals.service';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Locals')
@ApiBearerAuth()
@Controller('api/v1/locals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocalsController {
  constructor(private readonly localsService: LocalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new local' })
  create(@Body() dto: CreateLocalDto) { return this.localsService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List all locals' })
  findAll(@Query() query: PaginationQueryDto) { return this.localsService.findAll(query.page, query.limit); }

  @Get(':id')
  @ApiOperation({ summary: 'Get local by ID' })
  findOne(@Param('id') id: string) { return this.localsService.findById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a local' })
  update(@Param('id') id: string, @Body() dto: UpdateLocalDto) { return this.localsService.update(id, dto); }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a local' })
  remove(@Param('id') id: string) { return this.localsService.delete(id); }
}
