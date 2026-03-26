import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ThingsRepository } from '../things/things.repository';
import { NetworksRepository } from '../networks/networks.repository';
import { HealthStatus } from '../things/schemas/thing.schema';
import { StatusHistoryService } from '../status-history/status-history.service';

@Injectable()
export class MonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorService.name);
  private subscriber: Redis;

  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly networksRepository: NetworksRepository,
    private readonly configService: ConfigService,
    private readonly statusHistoryService: StatusHistoryService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:9079';
    this.subscriber = new Redis(redisUrl);

    this.subscriber.subscribe('health:check:completed', (err) => {
      if (err) this.logger.error(`Failed to subscribe: ${err.message}`);
      else this.logger.log('Subscribed to health:check:completed');
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'health:check:completed') {
        try {
          const data = JSON.parse(message);
          await this.processHealthCheck(data.hosts || []);
        } catch (err) {
          this.logger.error(`Error processing health check: ${err}`);
        }
      }
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('health:check:completed');
      await this.subscriber.quit();
    }
  }

  async getStatus() {
    const [regCounts, healthCounts, total] = await Promise.all([
      this.thingsRepository.countByRegistrationStatus(),
      this.thingsRepository.countByHealthStatus(),
      this.thingsRepository.countTotal(),
    ]);
    return {
      total,
      registered: regCounts['registered'] || 0,
      discovered: regCounts['discovered'] || 0,
      online: healthCounts['online'] || 0,
      offline: healthCounts['offline'] || 0,
      unknown: healthCounts['unknown'] || 0,
    };
  }

  async checkThing(thingId: string) {
    const thing = await this.thingsRepository.findById(thingId);
    if (!thing) return { status: 'not_found' };
    return {
      id: thing._id,
      name: thing.name,
      registrationStatus: (thing as any).registrationStatus,
      healthStatus: (thing as any).healthStatus,
      lastSeenAt: thing.lastSeenAt,
    };
  }

  async getNetworksToCheck(): Promise<{ networkId: string; cidr: string }[]> {
    const ThingModel = this.thingsRepository.getModel();
    const networks = await ThingModel.aggregate([
      { $match: { registrationStatus: 'registered' } },
      { $group: { _id: '$networkId' } },
    ]).exec();

    const result: { networkId: string; cidr: string }[] = [];
    for (const n of networks) {
      if (!n._id) continue;
      const network = await this.networksRepository.findById(n._id.toString());
      if (network) result.push({ networkId: n._id.toString(), cidr: network.cidr });
    }
    return result;
  }

  private async processHealthCheck(hosts: any[]) {
    const foundMacs = new Set(hosts.filter((h: any) => h.macAddress).map((h: any) => h.macAddress.toUpperCase()));
    const foundIps = new Set(hosts.filter((h: any) => h.ipAddress).map((h: any) => h.ipAddress));

    const ThingModel = this.thingsRepository.getModel();
    const registeredThings = await ThingModel.find({ registrationStatus: 'registered' }).exec();

    let onlineCount = 0;
    let offlineCount = 0;

    for (const thing of registeredThings) {
      const macMatch = thing.macAddress && foundMacs.has(thing.macAddress.toUpperCase());
      const ipMatch = thing.ipAddress && foundIps.has(thing.ipAddress);
      const isOnline = macMatch || ipMatch;

      const newHealth = isOnline ? HealthStatus.ONLINE : HealthStatus.OFFLINE;
      const oldHealth = (thing as any).healthStatus;
      if (oldHealth !== newHealth) {
        await this.statusHistoryService.recordTransition(thing._id.toString(), newHealth);
      }
      await ThingModel.updateOne(
        { _id: thing._id },
        { $set: { healthStatus: newHealth, ...(isOnline ? { lastSeenAt: new Date() } : {}) } },
      );
      if (isOnline) onlineCount++; else offlineCount++;
    }

    this.logger.log(`Health check processed: ${onlineCount} online, ${offlineCount} offline`);
  }
}
