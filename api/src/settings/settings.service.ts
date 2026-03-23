import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { UsersService } from '../users/users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { Settings } from './schemas/settings.schema';
import { UserRole } from '../users/interfaces/user.interface';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly usersService: UsersService,
  ) {}

  async get(): Promise<Settings> {
    return this.settingsRepository.getOrCreate();
  }

  async update(updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    await this.settingsRepository.getOrCreate();
    return this.settingsRepository.update(updateSettingsDto);
  }

  async isSetupComplete(): Promise<boolean> {
    const settings = await this.settingsRepository.get();
    return settings?.setupCompleted === true;
  }

  async completeSetup(dto: CompleteSetupDto): Promise<Settings> {
    const isComplete = await this.isSetupComplete();
    if (isComplete) {
      throw new BadRequestException('Setup has already been completed');
    }

    await this.settingsRepository.getOrCreate();

    await this.settingsRepository.update({
      language: dto.language,
      instanceName: dto.instanceName,
      timezone: dto.timezone,
    });

    await this.usersService.create({
      username: dto.adminUsername,
      password: dto.adminPassword,
      role: UserRole.ADMIN,
    });

    return this.settingsRepository.markSetupComplete();
  }
}
