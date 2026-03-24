import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import ms from 'ms';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<TokenResponseDto> {
    const user = await this.usersService.findByUsername(username);
    if (!user) { throw new UnauthorizedException('Invalid credentials'); }
    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) { throw new UnauthorizedException('Invalid credentials'); }
    return this.generateTokens((user as any)._id.toString(), user.username, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const stored = await this.authRepository.findRefreshToken(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.authRepository.deleteRefreshToken(refreshToken);
    const user = await this.usersService.findById(stored.userId.toString());
    return this.generateTokens((user as any)._id.toString(), user.username, user.role);
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.deleteAllUserTokens(userId);
  }

  private async generateTokens(userId: string, username: string, role: string): Promise<TokenResponseDto> {
    const payload = { sub: userId, username, role };
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '15m';
    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));
    await this.authRepository.createRefreshToken(userId, refreshToken, expiresAt);
    return { accessToken, refreshToken, expiresIn };
  }
}
