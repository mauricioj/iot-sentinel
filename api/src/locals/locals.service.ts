import { Injectable, NotFoundException } from '@nestjs/common';
import { LocalsRepository } from './locals.repository';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';
import { Local } from './schemas/local.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class LocalsService {
  constructor(private readonly localsRepository: LocalsRepository) {}

  async create(dto: CreateLocalDto): Promise<Local> {
    return this.localsRepository.create(dto);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Local>> {
    const { data, total } = await this.localsRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Local> {
    const local = await this.localsRepository.findById(id);
    if (!local) { throw new NotFoundException('Local not found'); }
    return local;
  }

  async update(id: string, dto: UpdateLocalDto): Promise<Local> {
    const local = await this.localsRepository.update(id, dto);
    if (!local) { throw new NotFoundException('Local not found'); }
    return local;
  }

  async delete(id: string): Promise<void> {
    const local = await this.localsRepository.delete(id);
    if (!local) { throw new NotFoundException('Local not found'); }
  }
}
