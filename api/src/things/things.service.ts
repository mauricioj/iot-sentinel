import { Injectable, NotFoundException } from '@nestjs/common';
import { ThingsRepository } from './things.repository';
import { NetworksService } from '../networks/networks.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';
import { Thing } from './schemas/thing.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class ThingsService {
  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly networksService: NetworksService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(dto: CreateThingDto): Promise<Thing> {
    await this.networksService.findById(dto.networkId);
    if (dto.credentials) {
      dto.credentials = this.encryptCredentials(dto.credentials);
    }
    return this.thingsRepository.create(dto);
  }

  async findAll(query: ThingQueryDto): Promise<PaginatedResponseDto<Thing>> {
    const { data, total } = await this.thingsRepository.findAll(query);
    return PaginatedResponseDto.create(data, total, query.page, query.limit);
  }

  async findById(id: string): Promise<Record<string, unknown>> {
    const thing = await this.thingsRepository.findById(id);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
    const obj = thing.toObject() as unknown as Record<string, unknown>;
    if (obj.credentials) {
      obj.credentials = this.decryptCredentials(obj.credentials as { username?: string; password?: string; notes?: string });
    }
    return obj;
  }

  async update(id: string, dto: UpdateThingDto): Promise<Thing> {
    if (dto.credentials) {
      dto.credentials = this.encryptCredentials(dto.credentials);
    }
    const thing = await this.thingsRepository.update(id, dto as Partial<UpdateThingDto & Record<string, unknown>>);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
    return thing;
  }

  async delete(id: string): Promise<void> {
    const thing = await this.thingsRepository.delete(id);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
  }

  async deleteByStatus(status: string): Promise<{ deleted: number }> {
    const deleted = await this.thingsRepository.deleteByStatus(status);
    return { deleted };
  }

  async findByGroupId(groupId: string, page: number, limit: number): Promise<PaginatedResponseDto<Thing>> {
    const { data, total } = await this.thingsRepository.findByGroupId(groupId, page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  private encryptCredentials(creds: { username?: string; password?: string; notes?: string }) {
    return {
      username: creds.username ? this.cryptoService.encrypt(creds.username) : '',
      password: creds.password ? this.cryptoService.encrypt(creds.password) : '',
      notes: creds.notes ? this.cryptoService.encrypt(creds.notes) : '',
    };
  }

  private decryptCredentials(creds: { username?: string; password?: string; notes?: string }) {
    return {
      username: creds.username ? this.cryptoService.decrypt(creds.username) : '',
      password: creds.password ? this.cryptoService.decrypt(creds.password) : '',
      notes: creds.notes ? this.cryptoService.decrypt(creds.notes) : '',
    };
  }
}
