import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Local, LocalDocument } from './schemas/local.schema';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';

@Injectable()
export class LocalsRepository {
  constructor(@InjectModel(Local.name) private readonly localModel: Model<LocalDocument>) {}

  async create(dto: CreateLocalDto): Promise<LocalDocument> {
    return this.localModel.create(dto);
  }

  async findAll(page: number, limit: number): Promise<{ data: LocalDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.localModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.localModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<LocalDocument | null> {
    return this.localModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateLocalDto): Promise<LocalDocument | null> {
    return this.localModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<LocalDocument | null> {
    return this.localModel.findByIdAndDelete(id).exec();
  }
}
