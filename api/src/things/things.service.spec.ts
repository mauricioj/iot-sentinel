// api/src/things/things.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ThingsService } from './things.service';
import { ThingsRepository } from './things.repository';
import { NetworksService } from '../networks/networks.service';
import { CryptoService } from '../crypto/crypto.service';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByMacAddress: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGroupId: jest.fn(),
};

const mockNetworksService = { findById: jest.fn() };
const mockCryptoService = {
  encrypt: jest.fn((v: string) => `encrypted:${v}`),
  decrypt: jest.fn((v: string) => v.replace('encrypted:', '')),
};

describe('ThingsService', () => {
  let service: ThingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThingsService,
        { provide: ThingsRepository, useValue: mockRepository },
        { provide: NetworksService, useValue: mockNetworksService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<ThingsService>(ThingsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should verify network exists, encrypt credentials, and create thing', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1' });
      mockRepository.create.mockResolvedValue({
        _id: '1', name: 'Camera', networkId: 'net1',
        credentials: { username: 'encrypted:admin', password: 'encrypted:pass', notes: '' },
      });

      const result = await service.create({
        networkId: 'net1',
        name: 'Camera',
        type: 'camera',
        credentials: { username: 'admin', password: 'pass' },
      });

      expect(mockNetworksService.findById).toHaveBeenCalledWith('net1');
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('admin');
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('pass');
      expect(result.name).toBe('Camera');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should decrypt credentials on find', async () => {
      mockRepository.findById.mockResolvedValue({
        _id: '1', name: 'Camera',
        credentials: { username: 'encrypted:admin', password: 'encrypted:pass', notes: '' },
        toObject: function() { return { ...this }; },
      });

      const result = await service.findById('1');
      expect(mockCryptoService.decrypt).toHaveBeenCalledWith('encrypted:admin');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
