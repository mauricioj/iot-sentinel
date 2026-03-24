import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { NotFoundException } from '@nestjs/common';

const mockRepository = { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), update: jest.fn(), delete: jest.fn() };

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupsService, { provide: GroupsRepository, useValue: mockRepository }],
    }).compile();
    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a group', async () => {
      const dto = { name: 'Cameras', icon: 'camera', color: '#22c55e' };
      mockRepository.create.mockResolvedValue({ _id: '1', ...dto });
      const result = await service.create(dto);
      expect(result.name).toBe('Cameras');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
