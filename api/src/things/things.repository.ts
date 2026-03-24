import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Thing, ThingDocument } from './schemas/thing.schema';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';

@Injectable()
export class ThingsRepository {
  constructor(@InjectModel(Thing.name) private readonly thingModel: Model<ThingDocument>) {}

  async create(dto: CreateThingDto): Promise<ThingDocument> {
    const data = {
      ...dto,
      networkId: new Types.ObjectId(dto.networkId),
      groupIds: dto.groupIds?.map((id) => new Types.ObjectId(id)) || [],
    };
    return this.thingModel.create(data);
  }

  async findAll(query: ThingQueryDto): Promise<{ data: ThingDocument[]; total: number }> {
    const filter: FilterQuery<Thing> = {};

    if (query.networkId) {
      filter.networkId = new Types.ObjectId(query.networkId);
    }
    if (query.groupId) {
      filter.groupIds = new Types.ObjectId(query.groupId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.q) {
      const regex = new RegExp(query.q, 'i');
      filter.$or = [
        { name: regex },
        { macAddress: regex },
        { ipAddress: regex },
        { hostname: regex },
        { 'channels.name': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.thingModel
        .find(filter)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .sort({ name: 1 })
        .exec(),
      this.thingModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ThingDocument | null> {
    return this.thingModel.findById(id).exec();
  }

  async findByMacAddress(mac: string): Promise<ThingDocument | null> {
    return this.thingModel.findOne({ macAddress: mac }).exec();
  }

  async update(id: string, dto: Partial<UpdateThingDto & Record<string, unknown>>): Promise<ThingDocument | null> {
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.networkId) {
      updateData.networkId = new Types.ObjectId(dto.networkId);
    }
    if (dto.groupIds) {
      updateData.groupIds = dto.groupIds.map((id) => new Types.ObjectId(id));
    }
    return this.thingModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<ThingDocument | null> {
    return this.thingModel.findByIdAndDelete(id).exec();
  }

  async countByNetworkId(networkId: string): Promise<number> {
    return this.thingModel.countDocuments({ networkId: new Types.ObjectId(networkId) }).exec();
  }

  async countByGroupId(groupId: string): Promise<number> {
    return this.thingModel.countDocuments({ groupIds: new Types.ObjectId(groupId) }).exec();
  }

  async countByStatus(): Promise<Record<string, number>> {
    const results = await this.thingModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r._id] = r.count;
    }
    return counts;
  }

  async countTotal(): Promise<number> {
    return this.thingModel.countDocuments().exec();
  }

  async findByGroupId(groupId: string, page: number, limit: number): Promise<{ data: ThingDocument[]; total: number }> {
    const filter = { groupIds: new Types.ObjectId(groupId) };
    const [data, total] = await Promise.all([
      this.thingModel.find(filter).skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.thingModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }
}
