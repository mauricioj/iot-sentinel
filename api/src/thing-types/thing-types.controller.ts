import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThingTypesService } from './thing-types.service';
import { CreateThingTypeDto } from './dto/create-thing-type.dto';
import { UpdateThingTypeDto } from './dto/update-thing-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Thing Types')
@ApiBearerAuth()
@Controller('api/v1/thing-types')
@UseGuards(JwtAuthGuard)
export class ThingTypesController {
  constructor(private readonly service: ThingTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all thing types' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get thing type by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a thing type' })
  create(@Body() dto: CreateThingTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a thing type' })
  update(@Param('id') id: string, @Body() dto: UpdateThingTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a thing type' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
