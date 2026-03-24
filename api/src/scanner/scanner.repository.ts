import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScanJob, ScanJobDocument, ScanStatus } from './schemas/scan-job.schema';

@Injectable()
export class ScannerRepository {
  constructor(@InjectModel(ScanJob.name) private readonly scanJobModel: Model<ScanJobDocument>) {}

  async create(data: Partial<ScanJob>): Promise<ScanJobDocument> {
    return this.scanJobModel.create({
      ...data,
      networkId: new Types.ObjectId(data.networkId as unknown as string),
      userId: data.userId ? new Types.ObjectId(data.userId as unknown as string) : null,
    });
  }

  async findById(id: string): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findById(id).exec();
  }

  async findAll(page: number, limit: number): Promise<{ data: ScanJobDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.scanJobModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.scanJobModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async updateStatus(id: string, status: ScanStatus, extra?: Partial<ScanJob>): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findByIdAndUpdate(id, { status, ...extra }, { new: true }).exec();
  }

  async hasActiveScans(networkId: string): Promise<boolean> {
    const count = await this.scanJobModel.countDocuments({
      networkId: new Types.ObjectId(networkId),
      status: { $in: [ScanStatus.QUEUED, ScanStatus.RUNNING] },
    }).exec();
    return count > 0;
  }

  async getLastCompletedScan(networkId: string): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findOne({
      networkId: new Types.ObjectId(networkId),
      status: ScanStatus.COMPLETED,
    }).sort({ completedAt: -1 }).exec();
  }

  async countPending(): Promise<number> {
    return this.scanJobModel.countDocuments({ status: ScanStatus.QUEUED }).exec();
  }

  async findRecentByNetworkId(networkId: string): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findOne({
      networkId: new Types.ObjectId(networkId),
      status: { $in: [ScanStatus.QUEUED, ScanStatus.RUNNING] },
    }).sort({ createdAt: -1 }).exec();
  }
}
