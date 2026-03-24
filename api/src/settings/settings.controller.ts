import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Settings')
@Controller('api/v1')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('setup/status')
  @ApiOperation({ summary: 'Check if initial setup is complete' })
  async getSetupStatus() {
    const isComplete = await this.settingsService.isSetupComplete();
    return { setupCompleted: isComplete };
  }

  @Post('setup/complete')
  @ApiOperation({ summary: 'Complete initial setup wizard' })
  completeSetup(@Body() completeSetupDto: CompleteSetupDto) {
    return this.settingsService.completeSetup(completeSetupDto);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.settingsService.get();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.update(updateSettingsDto);
  }
}
