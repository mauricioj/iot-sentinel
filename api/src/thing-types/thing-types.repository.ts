import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ThingType, ThingTypeDocument } from './schemas/thing-type.schema';

@Injectable()
export class ThingTypesRepository {
  constructor(@InjectModel(ThingType.name) private readonly model: Model<ThingTypeDocument>) {}

  async create(data: Partial<ThingType>): Promise<ThingTypeDocument> {
    return this.model.create(data);
  }

  async findAll(): Promise<ThingTypeDocument[]> {
    return this.model.find().sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<ThingTypeDocument | null> {
    return this.model.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<ThingTypeDocument | null> {
    return this.model.findOne({ slug }).exec();
  }

  async update(id: string, data: Partial<ThingType>): Promise<ThingTypeDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<ThingTypeDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async insertMany(data: Partial<ThingType>[]): Promise<void> {
    await this.model.insertMany(data);
  }
}
