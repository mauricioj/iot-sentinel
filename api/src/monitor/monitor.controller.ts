import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Monitor')
@Controller('api/v1/monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('networks-to-check')
  @ApiOperation({ summary: 'Get networks with registered things for health checking (internal)' })
  getNetworksToCheck() { return this.monitorService.getNetworksToCheck(); }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall monitoring status' })
  getStatus() { return this.monitorService.getStatus(); }

  @Post('check/:thingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check status of a specific thing' })
  checkThing(@Param('thingId') thingId: string) { return this.monitorService.checkThing(thingId); }
}
