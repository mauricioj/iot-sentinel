import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ _id: false })
class BackupSettings {
  @Prop({ default: false })
  autoEnabled: boolean;
  @Prop({ enum: ['daily', 'weekly', 'monthly'], default: 'weekly' })
  frequency: string;
  @Prop()
  password: string;
  @Prop({ default: 5 })
  retention: number;
  @Prop({ enum: ['local', 'google_drive', 's3'], default: 'local' })
  destination: string;
}

@Schema({ _id: false })
class MonitorSettings {
  @Prop({ default: 300 })
  statusCheckInterval: number;
}

@Schema({ _id: false })
class ScannerSettings {
  @Prop({ default: 1 })
  maxConcurrentScans: number;
  @Prop({ default: 60 })
  cooldownSeconds: number;
}

@Schema({ timestamps: true })
export class Settings {
  @Prop({ default: 'IoT Sentinel' })
  instanceName: string;
  @Prop({ default: 'en-US' })
  language: string;
  @Prop({ default: 'UTC' })
  timezone: string;
  @Prop({ default: false })
  setupCompleted: boolean;
  @Prop({ type: BackupSettings, default: () => ({}) })
  backup: BackupSettings;
  @Prop({ type: MonitorSettings, default: () => ({}) })
  monitor: MonitorSettings;
  @Prop({ type: ScannerSettings, default: () => ({}) })
  scanner: ScannerSettings;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
