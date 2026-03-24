import { Injectable, Logger } from '@nestjs/common';
import { ThingsRepository } from '../things/things.repository';
import { ScannerService } from '../scanner/scanner.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly scannerService: ScannerService,
    private readonly settingsService: SettingsService,
  ) {}

  async getStatus() {
    const statusCounts = await this.thingsRepository.countByStatus();
    const total = await this.thingsRepository.countTotal();
    return {
      total,
      online: statusCounts['online'] || 0,
      offline: statusCounts['offline'] || 0,
      unknown: statusCounts['unknown'] || 0,
      discovered: statusCounts['discovered'] || 0,
    };
  }

  async checkThing(thingId: string) {
    const thing = await this.thingsRepository.findById(thingId);
    if (!thing) {
      return { status: 'not_found' };
    }
    return {
      id: thing._id,
      name: thing.name,
      status: thing.status,
      lastSeenAt: thing.lastSeenAt,
    };
  }
}
