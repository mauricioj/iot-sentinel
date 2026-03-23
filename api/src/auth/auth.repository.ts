import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return this.refreshTokenModel.create({ userId: new Types.ObjectId(userId), token, expiresAt });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenModel.findOne({ token }).exec();
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ token }).exec();
  }

  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
  }
}
