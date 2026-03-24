import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Monitor')
@ApiBearerAuth()
@Controller('api/v1/monitor')
@UseGuards(JwtAuthGuard)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get overall monitoring status' })
  getStatus() { return this.monitorService.getStatus(); }

  @Post('check/:thingId')
  @ApiOperation({ summary: 'Check status of a specific thing' })
  checkThing(@Param('thingId') thingId: string) { return this.monitorService.checkThing(thingId); }
}
