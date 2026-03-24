import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { ScannerRepository } from './scanner.repository';
import { ScannerProcessor } from './scanner.processor';
import { ScanJob, ScanJobSchema } from './schemas/scan-job.schema';
import { NetworksModule } from '../networks/networks.module';
import { ThingsModule } from '../things/things.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ScanJob.name, schema: ScanJobSchema }]),
    BullModule.registerQueue({ name: 'scanner' }),
    NetworksModule,
    ThingsModule,
    SettingsModule,
  ],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerRepository, ScannerProcessor],
  exports: [ScannerService],
})
export class ScannerModule {}
