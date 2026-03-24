import { Injectable } from '@nestjs/common';
import { ThingsRepository } from '../things/things.repository';
import { LocalsRepository } from '../locals/locals.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly localsRepository: LocalsRepository,
  ) {}

  async getStats() {
    const [totalThings, statusCounts, { total: totalLocals }] = await Promise.all([
      this.thingsRepository.countTotal(),
      this.thingsRepository.countByStatus(),
      this.localsRepository.findAll(1, 1),
    ]);

    return {
      things: {
        total: totalThings,
        online: statusCounts['online'] || 0,
        offline: statusCounts['offline'] || 0,
        unknown: statusCounts['unknown'] || 0,
        discovered: statusCounts['discovered'] || 0,
      },
      locals: {
        total: totalLocals,
      },
    };
  }
}
