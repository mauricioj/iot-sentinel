import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class SetupGuard implements CanActivate {
  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.settingsService.isSetupComplete();
  }
}
