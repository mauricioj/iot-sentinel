import { Test, TestingModule } from '@nestjs/testing';
import { NetworksService } from './networks.service';
import { NetworksRepository } from './networks.repository';
import { LocalsService } from '../locals/locals.service';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findByLocalId: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countByLocalId: jest.fn(),
};

const mockLocalsService = {
  findById: jest.fn(),
};

describe('NetworksService', () => {
  let service: NetworksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworksService,
        { provide: NetworksRepository, useValue: mockRepository },
        { provide: LocalsService, useValue: mockLocalsService },
      ],
    }).compile();
    service = module.get<NetworksService>(NetworksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should verify local exists and create network', async () => {
      mockLocalsService.findById.mockResolvedValue({ _id: 'local1', name: 'Casa' });
      mockRepository.create.mockResolvedValue({ _id: 'net1', name: 'VLAN 10', localId: 'local1' });
      const result = await service.create('local1', { name: 'VLAN 10', cidr: '192.168.10.0/24' });
      expect(result.name).toBe('VLAN 10');
      expect(mockLocalsService.findById).toHaveBeenCalledWith('local1');
    });

    it('should throw NotFoundException if local does not exist', async () => {
      mockLocalsService.findById.mockRejectedValue(new NotFoundException('Local not found'));
      await expect(service.create('nonexistent', { name: 'VLAN', cidr: '10.0.0.0/8' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByLocalId', () => {
    it('should verify local exists and return paginated networks', async () => {
      mockLocalsService.findById.mockResolvedValue({ _id: 'local1' });
      mockRepository.findByLocalId.mockResolvedValue({ data: [], total: 0 });
      const result = await service.findByLocalId('local1', 1, 20);
      expect(result.meta.total).toBe(0);
    });
  });
});
