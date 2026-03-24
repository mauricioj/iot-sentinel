import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsRepository {
  constructor(@InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>) {}

  async create(dto: CreateGroupDto): Promise<GroupDocument> { return this.groupModel.create(dto); }

  async findAll(page: number, limit: number): Promise<{ data: GroupDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.groupModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.groupModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<GroupDocument | null> { return this.groupModel.findById(id).exec(); }

  async update(id: string, dto: UpdateGroupDto): Promise<GroupDocument | null> {
    return this.groupModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<GroupDocument | null> { return this.groupModel.findByIdAndDelete(id).exec(); }
}
