import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ScannerRepository } from './scanner.repository';
import { ThingsRepository } from '../things/things.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ScanStatus, DiscoveredHost } from './schemas/scan-job.schema';
import { ThingStatus } from '../things/schemas/thing.schema';

/**
 * Listens for scan job completion events published by the Python worker
 * via Redis pub/sub, then processes results (MAC matching, Thing CRUD).
 *
 * The Python worker is the ONLY consumer of the Bull queue.
 * NestJS does NOT consume jobs — it only reacts to completion events.
 */
@Injectable()
export class ScannerProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerProcessor.name);
  private subscriber: Redis;

  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly thingsRepository: ThingsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.subscriber = new Redis(redisUrl);

    this.subscriber.subscribe('bull:scanner:completed', (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to completion channel: ${err.message}`);
      } else {
        this.logger.log('Subscribed to bull:scanner:completed channel');
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'bull:scanner:completed') {
        try {
          const data = JSON.parse(message);
          await this.handleCompletion(data);
        } catch (err) {
          this.logger.error(`Error processing completion event: ${err}`);
        }
      }
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('bull:scanner:completed');
      await this.subscriber.quit();
    }
  }

  private async handleCompletion(data: { jobId: string; returnvalue: { hosts: any[] } }) {
    const { jobId, returnvalue } = data;
    if (!returnvalue?.hosts) {
      this.logger.warn(`Job ${jobId} completed but no hosts in result`);
      return;
    }

    const hosts = returnvalue.hosts;
    this.logger.log(`Processing scan results: ${hosts.length} hosts from job ${jobId}`);

    // Find the scan job to get networkId
    // The jobId from Python is the Bull Redis ID, but we need our MongoDB job
    // The Python worker receives jobId from the job data (which is our MongoDB _id)
    const jobData = await this.findJobByRedisOrMongoId(jobId);
    if (!jobData) {
      this.logger.warn(`Could not find scan job for ID ${jobId}`);
      return;
    }

    const { mongoJobId, networkId } = jobData;

    // Mark as running if still queued
    await this.scannerRepository.updateStatus(mongoJobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });

    // Process each discovered host
    const processedHosts: DiscoveredHost[] = [];
    for (const host of hosts) {
      try {
        const existing = host.macAddress
          ? await this.thingsRepository.findByMacAddress(host.macAddress)
          : null;

        if (existing) {
          await this.thingsRepository.update(existing._id.toString(), {
            ipAddress: host.ipAddress,
            hostname: host.hostname || existing.hostname,
            status: ThingStatus.ONLINE,
            lastSeenAt: new Date(),
            ports: host.ports || [],
          } as any);
          processedHosts.push({ ...host, isNew: false });
        } else if (host.macAddress || host.ipAddress) {
          await this.thingsRepository.create({
            networkId,
            name: host.hostname || host.ipAddress,
            type: 'other' as any,
            macAddress: host.macAddress || undefined,
            ipAddress: host.ipAddress,
            hostname: host.hostname || '',
            status: ThingStatus.DISCOVERED,
            lastSeenAt: new Date(),
            ports: host.ports || [],
          } as any);
          processedHosts.push({ ...host, isNew: true });
        }
      } catch (err) {
        this.logger.error(`Error processing host ${host.ipAddress}: ${err}`);
      }
    }

    // Update scan job with results
    await this.scannerRepository.updateStatus(mongoJobId, ScanStatus.COMPLETED, {
      completedAt: new Date(),
      results: processedHosts,
    });

    const newOnes = processedHosts.filter((h) => h.isNew);
    const updatedOnes = processedHosts.filter((h) => !h.isNew);
    this.logger.log(`Scan job ${mongoJobId} completed: ${newOnes.length} new, ${updatedOnes.length} updated`);

    // Evaluate notification rules for newly discovered things
    if (newOnes.length > 0) {
      try {
        await this.notificationsService.evaluateDiscoveryRules(
          networkId,
          newOnes.map((h) => ({
            name: h.hostname || h.ipAddress,
            ipAddress: h.ipAddress,
          })),
        );
      } catch (err) {
        this.logger.error(`Error evaluating notification rules: ${err}`);
      }
    }
  }

  /**
   * The Python worker receives the MongoDB job ID in job.data.jobId.
   * The Redis pub/sub message contains the Bull Redis ID (a number).
   * We need to find the MongoDB scan job either way.
   */
  private async findJobByRedisOrMongoId(id: string): Promise<{ mongoJobId: string; networkId: string } | null> {
    // Check if it looks like a MongoDB ObjectId (24 hex chars) or a Bull Redis ID (numeric)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isMongoId) {
      const directJob = await this.scannerRepository.findById(id);
      if (directJob) {
        return { mongoJobId: directJob._id.toString(), networkId: directJob.networkId.toString() };
      }
    }

    // It's a Bull Redis ID — read job data from Redis to get the MongoDB job ID
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      const reader = new Redis(redisUrl);
      const jobData = await reader.hget(`bull:scanner:${id}`, 'data');
      await reader.quit();

      if (jobData) {
        const parsed = JSON.parse(jobData);
        this.logger.log(`Redis job ${id} has data.jobId = ${parsed.jobId}`);
        if (parsed.jobId) {
          const mongoJob = await this.scannerRepository.findById(parsed.jobId);
          if (mongoJob) {
            return { mongoJobId: mongoJob._id.toString(), networkId: mongoJob.networkId.toString() };
          }
        }
        // Fallback: use networkId from job data directly
        if (parsed.networkId) {
          // Find the most recent queued/running job for this network
          const jobs = await this.scannerRepository.findRecentByNetworkId(parsed.networkId);
          if (jobs) {
            return { mongoJobId: jobs._id.toString(), networkId: jobs.networkId.toString() };
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error looking up Redis job ${id}: ${err}`);
    }

    return null;
  }
}
