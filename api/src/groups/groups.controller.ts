import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('api/v1/groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new group' })
  create(@Body() dto: CreateGroupDto) { return this.groupsService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  findAll(@Query() query: PaginationQueryDto) { return this.groupsService.findAll(query.page, query.limit); }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  findOne(@Param('id') id: string) { return this.groupsService.findById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a group' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) { return this.groupsService.update(id, dto); }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string) { return this.groupsService.delete(id); }
}
