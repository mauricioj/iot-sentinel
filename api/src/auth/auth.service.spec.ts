import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/interfaces/user.interface';

const mockUsersService = { findByUsername: jest.fn(), validatePassword: jest.fn() };
const mockAuthRepository = { createRefreshToken: jest.fn(), findRefreshToken: jest.fn(), deleteRefreshToken: jest.fn(), deleteAllUserTokens: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = { JWT_EXPIRATION: '15m', JWT_REFRESH_EXPIRATION: '7d' };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      mockUsersService.findByUsername.mockResolvedValue({ _id: '123', username: 'admin', password: 'hashed', role: UserRole.ADMIN });
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockAuthRepository.createRefreshToken.mockResolvedValue({});
      const result = await service.login('admin', 'password');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException on invalid username', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      await expect(service.login('wrong', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockUsersService.findByUsername.mockResolvedValue({ _id: '123', username: 'admin', password: 'hashed', role: UserRole.ADMIN });
      mockUsersService.validatePassword.mockResolvedValue(false);
      await expect(service.login('admin', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
