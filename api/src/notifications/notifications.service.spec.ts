// api/src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from './schemas/notification.schema';

const mockRepository = {
  createRule: jest.fn(),
  findAllRules: jest.fn(),
  findRuleById: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
  findEnabledRules: jest.fn(),
  createNotification: jest.fn(),
  findAllNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  countUnread: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create a notification rule', async () => {
      const dto = { name: 'Test Rule', targetType: 'thing' as any, targetId: '123', condition: 'status_change' as any };
      mockRepository.createRule.mockResolvedValue({ _id: 'rule1', ...dto });
      const result = await service.createRule(dto);
      expect(result.name).toBe('Test Rule');
    });
  });

  describe('findRuleById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findRuleById.mockResolvedValue(null);
      await expect(service.findRuleById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('emit', () => {
    it('should create a notification', async () => {
      mockRepository.createNotification.mockResolvedValue({
        _id: 'n1', type: NotificationType.THING_OFFLINE, message: 'Camera went offline',
      });
      const result = await service.emit(NotificationType.THING_OFFLINE, 'Camera went offline', 'thing1', 'rule1');
      expect(result.type).toBe(NotificationType.THING_OFFLINE);
    });
  });

  describe('countUnread', () => {
    it('should return unread count', async () => {
      mockRepository.countUnread.mockResolvedValue(5);
      expect(await service.countUnread()).toBe(5);
    });
  });
});
