import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScannerRepository } from './scanner.repository';
import { NetworksService } from '../networks/networks.service';
import { SettingsService } from '../settings/settings.service';
import { ScanJob, ScanType, ScanStatus, ScanTrigger } from './schemas/scan-job.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

const MAX_QUEUE_DEPTH = 10;

@Injectable()
export class ScannerService {
  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly networksService: NetworksService,
    private readonly settingsService: SettingsService,
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
  ) {}

  async discover(networkId: string, type: ScanType = ScanType.DISCOVERY, userId?: string): Promise<ScanJob> {
    const network = await this.networksService.findById(networkId);
    const settings = await this.settingsService.get();
    const { maxConcurrentScans, cooldownSeconds } = settings.scanner;

    // Rate limiting: check active scans
    const hasActive = await this.scannerRepository.hasActiveScans(networkId);
    if (hasActive) {
      throw new ConflictException('A scan is already running or queued for this network');
    }

    // Rate limiting: check cooldown
    const lastScan = await this.scannerRepository.getLastCompletedScan(networkId);
    if (lastScan?.completedAt) {
      const elapsed = (Date.now() - lastScan.completedAt.getTime()) / 1000;
      if (elapsed < cooldownSeconds) {
        throw new ConflictException(
          `Cooldown active. Wait ${Math.ceil(cooldownSeconds - elapsed)}s before scanning this network again`,
        );
      }
    }

    // Rate limiting: check global queue depth
    const pendingCount = await this.scannerRepository.countPending();
    if (pendingCount >= MAX_QUEUE_DEPTH) {
      throw new ConflictException('Scan queue is full. Try again later');
    }

    // Create job record
    const scanJob = await this.scannerRepository.create({
      networkId: networkId as any,
      type,
      status: ScanStatus.QUEUED,
      triggeredBy: userId ? ScanTrigger.MANUAL : ScanTrigger.SCHEDULED,
      userId: userId as any || null,
    });

    // Enqueue Bull job
    await this.scannerQueue.add(type, {
      jobId: scanJob._id.toString(),
      networkId,
      cidr: (network as any).cidr,
      type,
    });

    return scanJob;
  }

  async findById(id: string): Promise<ScanJob> {
    const job = await this.scannerRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Scan job not found');
    }
    return job;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<ScanJob>> {
    const { data, total } = await this.scannerRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }
}
