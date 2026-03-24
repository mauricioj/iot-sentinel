import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScannerRepository } from './scanner.repository';
import { ThingsRepository } from '../things/things.repository';
import { ScanStatus, DiscoveredHost } from './schemas/scan-job.schema';
import { ThingStatus } from '../things/schemas/thing.schema';

@Processor('scanner')
export class ScannerProcessor {
  private readonly logger = new Logger(ScannerProcessor.name);

  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly thingsRepository: ThingsRepository,
  ) {}

  @Process('discovery')
  async handleDiscovery(job: Job) {
    this.logger.log(`Processing discovery job ${job.data.jobId} for ${job.data.cidr}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    // The actual scan is done by the Python worker.
    // This process handler is a placeholder — the real work happens in @OnQueueCompleted.
    // In production, the Python worker consumes directly from Redis.
    // For the NestJS side, we only listen for completion events.
    return job.data;
  }

  @Process('status_check')
  async handleStatusCheck(job: Job) {
    this.logger.log(`Processing status_check job ${job.data.jobId}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    return job.data;
  }

  @Process('deep_scan')
  async handleDeepScan(job: Job) {
    this.logger.log(`Processing deep_scan job ${job.data.jobId}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    return job.data;
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    if (!result?.hosts) return;

    const { jobId, networkId } = job.data;
    const hosts: DiscoveredHost[] = result.hosts;
    this.logger.log(`Scan job ${jobId} completed with ${hosts.length} hosts found`);

    // Process each discovered host
    const processedHosts: DiscoveredHost[] = [];
    for (const host of hosts) {
      const existing = host.macAddress
        ? await this.thingsRepository.findByMacAddress(host.macAddress)
        : null;

      if (existing) {
        // Update existing thing
        await this.thingsRepository.update(existing._id.toString(), {
          ipAddress: host.ipAddress,
          hostname: host.hostname || existing.hostname,
          status: ThingStatus.ONLINE,
          lastSeenAt: new Date(),
          ports: host.ports as any,
        } as any);
        processedHosts.push({ ...host, isNew: false });
      } else {
        // Create discovered thing
        await this.thingsRepository.create({
          networkId,
          name: host.hostname || host.ipAddress,
          type: 'other' as any,
          macAddress: host.macAddress || undefined,
          ipAddress: host.ipAddress,
          hostname: host.hostname,
          ports: host.ports as any,
        } as any);
        processedHosts.push({ ...host, isNew: true });
      }
    }

    // Update scan job with results
    await this.scannerRepository.updateStatus(jobId, ScanStatus.COMPLETED, {
      completedAt: new Date(),
      results: processedHosts,
    });
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    const { jobId } = job.data;
    this.logger.error(`Scan job ${jobId} failed: ${error.message}`);
    await this.scannerRepository.updateStatus(jobId, ScanStatus.FAILED, {
      completedAt: new Date(),
      error: error.message,
    });
  }
}
