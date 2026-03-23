import { Injectable, NotFoundException } from '@nestjs/common';
import { NetworksRepository } from './networks.repository';
import { LocalsService } from '../locals/locals.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { Network } from './schemas/network.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class NetworksService {
  constructor(
    private readonly networksRepository: NetworksRepository,
    private readonly localsService: LocalsService,
  ) {}

  async create(localId: string, dto: CreateNetworkDto): Promise<Network> {
    await this.localsService.findById(localId);
    return this.networksRepository.create(localId, dto);
  }

  async findByLocalId(localId: string, page: number, limit: number): Promise<PaginatedResponseDto<Network>> {
    await this.localsService.findById(localId);
    const { data, total } = await this.networksRepository.findByLocalId(localId, page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Network>> {
    const { data, total } = await this.networksRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Network> {
    const network = await this.networksRepository.findById(id);
    if (!network) { throw new NotFoundException('Network not found'); }
    return network;
  }

  async update(id: string, dto: UpdateNetworkDto): Promise<Network> {
    const network = await this.networksRepository.update(id, dto);
    if (!network) { throw new NotFoundException('Network not found'); }
    return network;
  }

  async delete(id: string): Promise<void> {
    const network = await this.networksRepository.delete(id);
    if (!network) { throw new NotFoundException('Network not found'); }
  }

  async countByLocalId(localId: string): Promise<number> {
    return this.networksRepository.countByLocalId(localId);
  }
}
