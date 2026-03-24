// api/src/scanner/scanner.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerRepository } from './scanner.repository';
import { NetworksService } from '../networks/networks.service';
import { SettingsService } from '../settings/settings.service';
import { ScanType, ScanTrigger, ScanStatus } from './schemas/scan-job.schema';

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  hasActiveScans: jest.fn(),
  getLastCompletedScan: jest.fn(),
  countPending: jest.fn(),
  updateStatus: jest.fn(),
};

const mockNetworksService = {
  findById: jest.fn(),
};

const mockSettingsService = {
  get: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('ScannerService', () => {
  let service: ScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        { provide: ScannerRepository, useValue: mockRepository },
        { provide: NetworksService, useValue: mockNetworksService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: getQueueToken('scanner'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
    jest.clearAllMocks();
  });

  describe('discover', () => {
    it('should create scan job and enqueue', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockRepository.getLastCompletedScan.mockResolvedValue(null);
      mockRepository.countPending.mockResolvedValue(0);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });
      mockRepository.create.mockResolvedValue({ _id: 'job1', status: ScanStatus.QUEUED });
      mockQueue.add.mockResolvedValue({});

      const result = await service.discover('net1', ScanType.DISCOVERY, 'user1');
      expect(result.status).toBe(ScanStatus.QUEUED);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should reject if network has active scan', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(true);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });

    it('should reject if cooldown not elapsed', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });
      mockRepository.getLastCompletedScan.mockResolvedValue({
        completedAt: new Date(), // just completed — cooldown not elapsed
      });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });

    it('should reject if queue is full', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockRepository.getLastCompletedScan.mockResolvedValue(null);
      mockRepository.countPending.mockResolvedValue(10);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
