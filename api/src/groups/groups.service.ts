import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupsRepository } from './groups.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './schemas/group.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  async create(dto: CreateGroupDto): Promise<Group> { return this.groupsRepository.create(dto); }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Group>> {
    const { data, total } = await this.groupsRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupsRepository.findById(id);
    if (!group) { throw new NotFoundException('Group not found'); }
    return group;
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupsRepository.update(id, dto);
    if (!group) { throw new NotFoundException('Group not found'); }
    return group;
  }

  async delete(id: string): Promise<void> {
    const group = await this.groupsRepository.delete(id);
    if (!group) { throw new NotFoundException('Group not found'); }
  }
}
