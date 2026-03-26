// api/src/backup/backup.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { getModelToken } from '@nestjs/mongoose';
import { CryptoService } from '../crypto/crypto.service';

const makeModelMock = () => {
  const chain = {
    find: jest.fn(),
    select: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  chain.find.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.lean.mockReturnValue(chain);
  return chain;
};

const mockModels = {
  settings: makeModelMock(),
  users: makeModelMock(),
  locals: makeModelMock(),
  networks: makeModelMock(),
  things: makeModelMock(),
  groups: makeModelMock(),
  notificationRules: makeModelMock(),
  thingTypes: makeModelMock(),
  statusEvents: makeModelMock(),
};

const mockCryptoService = {
  decrypt: jest.fn((v: string) => `decrypted:${v}`),
  encrypt: jest.fn((v: string) => `encrypted:${v}`),
  encryptWithPassword: jest.fn((v: string) => `pw_encrypted:${v}`),
  decryptWithPassword: jest.fn((v: string) => v.replace('pw_encrypted:', '')),
};

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: getModelToken('Settings'), useValue: mockModels.settings },
        { provide: getModelToken('User'), useValue: mockModels.users },
        { provide: getModelToken('Local'), useValue: mockModels.locals },
        { provide: getModelToken('Network'), useValue: mockModels.networks },
        { provide: getModelToken('Thing'), useValue: mockModels.things },
        { provide: getModelToken('Group'), useValue: mockModels.groups },
        { provide: getModelToken('NotificationRule'), useValue: mockModels.notificationRules },
        { provide: getModelToken('ThingType'), useValue: mockModels.thingTypes },
        { provide: getModelToken('StatusEvent'), useValue: mockModels.statusEvents },
      ],
    }).compile();
    service = module.get<BackupService>(BackupService);
    jest.clearAllMocks();
  });

  describe('export', () => {
    it('should return a gzipped buffer with metadata', async () => {
      const result = await service.export('backup-password');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
