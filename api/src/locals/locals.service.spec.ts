import { Test, TestingModule } from '@nestjs/testing';
import { LocalsService } from './locals.service';
import { LocalsRepository } from './locals.repository';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('LocalsService', () => {
  let service: LocalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalsService,
        { provide: LocalsRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<LocalsService>(LocalsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a local', async () => {
      const dto = { name: 'Casa', description: 'Home', address: 'Rua A' };
      mockRepository.create.mockResolvedValue({ _id: '1', ...dto });
      const result = await service.create(dto);
      expect(result.name).toBe('Casa');
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated locals', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [{ _id: '1', name: 'Casa' }], total: 1 });
      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.update.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
