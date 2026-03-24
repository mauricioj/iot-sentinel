import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Network, NetworkDocument } from './schemas/network.schema';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';

@Injectable()
export class NetworksRepository {
  constructor(@InjectModel(Network.name) private readonly networkModel: Model<NetworkDocument>) {}

  async create(localId: string, dto: CreateNetworkDto): Promise<NetworkDocument> {
    return this.networkModel.create({ ...dto, localId: new Types.ObjectId(localId) });
  }

  async findByLocalId(localId: string, page: number, limit: number): Promise<{ data: NetworkDocument[]; total: number }> {
    const filter = { localId: new Types.ObjectId(localId) };
    const [data, total] = await Promise.all([
      this.networkModel.find(filter).skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.networkModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findAll(page: number, limit: number): Promise<{ data: NetworkDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.networkModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.networkModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<NetworkDocument | null> {
    return this.networkModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateNetworkDto): Promise<NetworkDocument | null> {
    return this.networkModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<NetworkDocument | null> {
    return this.networkModel.findByIdAndDelete(id).exec();
  }

  async countByLocalId(localId: string): Promise<number> {
    return this.networkModel.countDocuments({ localId: new Types.ObjectId(localId) }).exec();
  }
}
