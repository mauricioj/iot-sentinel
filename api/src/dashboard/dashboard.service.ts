import { Injectable } from '@nestjs/common';
import { ThingsRepository } from '../things/things.repository';
import { LocalsRepository } from '../locals/locals.repository';
import { StatusHistoryService } from '../status-history/status-history.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly localsRepository: LocalsRepository,
    private readonly statusHistoryService: StatusHistoryService,
  ) {}

  async getStats() {
    const [totalThings, regCounts, healthCounts, { total: totalLocals }] = await Promise.all([
      this.thingsRepository.countTotal(),
      this.thingsRepository.countByRegistrationStatus(),
      this.thingsRepository.countByHealthStatus(),
      this.localsRepository.findAll(1, 1),
    ]);

    return {
      things: {
        total: totalThings,
        registered: regCounts['registered'] || 0,
        discovered: regCounts['discovered'] || 0,
        online: healthCounts['online'] || 0,
        offline: healthCounts['offline'] || 0,
        unknown: healthCounts['unknown'] || 0,
      },
      locals: { total: totalLocals },
    };
  }

  async getAverageUptime(range: string) {
    return this.statusHistoryService.getAverageUptime(range);
  }
}
