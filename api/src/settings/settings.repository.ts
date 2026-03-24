import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(@InjectModel(Settings.name) private readonly settingsModel: Model<Settings>) {}

  async get(): Promise<Settings | null> {
    return this.settingsModel.findOne().exec();
  }

  async getOrCreate(): Promise<Settings> {
    let settings = await this.get();
    if (!settings) {
      settings = await this.settingsModel.create({});
    }
    return settings;
  }

  async update(updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    const flatUpdate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateSettingsDto)) {
      if (typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (nestedValue !== undefined) {
            flatUpdate[`${key}.${nestedKey}`] = nestedValue;
          }
        }
      } else if (value !== undefined) {
        flatUpdate[key] = value;
      }
    }
    return this.settingsModel
      .findOneAndUpdate({}, { $set: flatUpdate }, { new: true })
      .exec() as Promise<Settings>;
  }

  async markSetupComplete(): Promise<Settings> {
    return this.settingsModel
      .findOneAndUpdate({}, { $set: { setupCompleted: true } }, { new: true })
      .exec() as Promise<Settings>;
  }
}
