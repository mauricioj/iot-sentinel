import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { ThingsRepository } from './things.repository';
import { NetworksService } from '../networks/networks.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';
import { Thing } from './schemas/thing.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class ThingsService implements OnModuleInit {
  private readonly logger = new Logger(ThingsService.name);

  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly networksService: NetworksService,
    private readonly cryptoService: CryptoService,
  ) {}

  async onModuleInit() {
    // Migrate old status field to new registrationStatus + healthStatus
    const ThingModel = this.thingsRepository.getModel();
    const oldDocs = await ThingModel.find({ status: { $exists: true } }).exec();
    if (oldDocs.length > 0) {
      this.logger.log(`Migrating ${oldDocs.length} things from old status field...`);
      for (const doc of oldDocs) {
        const oldStatus = (doc as any).status;
        const regStatus = oldStatus === 'discovered' ? 'discovered' : 'registered';
        const healthStatus = oldStatus === 'online' ? 'online' : oldStatus === 'offline' ? 'offline' : 'unknown';
        await ThingModel.updateOne(
          { _id: doc._id },
          { $set: { registrationStatus: regStatus, healthStatus }, $unset: { status: 1 } },
        );
      }
      this.logger.log('Migration complete');
    }
  }

  async create(dto: CreateThingDto): Promise<Thing> {
    if (dto.networkId) {
      await this.networksService.findById(dto.networkId);
    }
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
    // Auto-register discovered things when user edits them
    const existing = await this.thingsRepository.findById(id);
    if (!existing) throw new NotFoundException('Thing not found');
    const updateData: Record<string, unknown> = { ...dto };
    if ((existing as any).registrationStatus === 'discovered') {
      updateData.registrationStatus = 'registered';
    }
    const thing = await this.thingsRepository.update(id, updateData);
    if (!thing) throw new NotFoundException('Thing not found');
    return thing;
  }

  async delete(id: string): Promise<void> {
    const thing = await this.thingsRepository.delete(id);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
  }

  async deleteDiscovered(): Promise<{ deleted: number }> {
    const deleted = await this.thingsRepository.deleteByRegistrationStatus('discovered');
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
