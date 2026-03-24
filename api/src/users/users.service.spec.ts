import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from './interfaces/user.interface';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      mockRepository.findByUsername.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ _id: '123', username: 'testuser', role: UserRole.VIEWER });

      const result = await service.create({ username: 'testuser', password: 'password123', role: UserRole.VIEWER });

      expect(result.username).toBe('testuser');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          password: expect.not.stringContaining('password123'),
        }),
      );
    });

    it('should throw ConflictException if username exists', async () => {
      mockRepository.findByUsername.mockResolvedValue({ username: 'existing' });
      await expect(service.create({ username: 'existing', password: 'pass123', role: UserRole.VIEWER })).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
