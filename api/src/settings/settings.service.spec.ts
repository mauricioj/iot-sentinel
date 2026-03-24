import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/interfaces/user.interface';

const mockRepository = {
  get: jest.fn(),
  getOrCreate: jest.fn(),
  update: jest.fn(),
  markSetupComplete: jest.fn(),
};

const mockUsersService = {
  create: jest.fn(),
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SettingsRepository, useValue: mockRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  describe('isSetupComplete', () => {
    it('should return false when no settings exist', async () => {
      mockRepository.get.mockResolvedValue(null);
      expect(await service.isSetupComplete()).toBe(false);
    });

    it('should return true when setup is completed', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: true });
      expect(await service.isSetupComplete()).toBe(true);
    });
  });

  describe('completeSetup', () => {
    it('should throw if setup already completed', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: true });

      await expect(
        service.completeSetup({
          language: 'en-US',
          instanceName: 'Test',
          timezone: 'UTC',
          adminUsername: 'admin',
          adminPassword: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create admin user and complete setup', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: false });
      mockRepository.getOrCreate.mockResolvedValue({ setupCompleted: false });
      mockRepository.update.mockResolvedValue({});
      mockRepository.markSetupComplete.mockResolvedValue({ setupCompleted: true });
      mockUsersService.create.mockResolvedValue({ _id: '123', username: 'admin' });

      await service.completeSetup({
        language: 'pt-BR',
        instanceName: 'My IoT',
        timezone: 'America/Sao_Paulo',
        adminUsername: 'admin',
        adminPassword: 'password123',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        role: UserRole.ADMIN,
      });
      expect(mockRepository.markSetupComplete).toHaveBeenCalled();
    });
  });
});
