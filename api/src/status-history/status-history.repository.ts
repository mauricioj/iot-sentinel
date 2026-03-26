import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StatusEvent, StatusEventDocument } from './schemas/status-event.schema';

@Injectable()
export class StatusHistoryRepository {
  constructor(@InjectModel(StatusEvent.name) private readonly model: Model<StatusEventDocument>) {}

  async create(thingId: string, healthStatus: string): Promise<StatusEventDocument> {
    return this.model.create({
      thingId: new Types.ObjectId(thingId),
      healthStatus,
      timestamp: new Date(),
    });
  }

  async findByThingId(thingId: string, since: Date): Promise<StatusEventDocument[]> {
    return this.model
      .find({ thingId: new Types.ObjectId(thingId), timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .exec();
  }

  async findLastBefore(thingId: string, before: Date): Promise<StatusEventDocument | null> {
    return this.model
      .findOne({ thingId: new Types.ObjectId(thingId), timestamp: { $lt: before } })
      .sort({ timestamp: -1 })
      .exec();
  }

  async findDistinctThingIds(since: Date): Promise<string[]> {
    const result = await this.model.distinct('thingId', { timestamp: { $gte: since } }).exec();
    return result.map((id: any) => id.toString());
  }

  getModel(): Model<StatusEventDocument> {
    return this.model;
  }
}
