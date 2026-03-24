import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { ThingsModule } from '../things/things.module';
import { ScannerModule } from '../scanner/scanner.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ScheduleModule.forRoot(), ThingsModule, ScannerModule, SettingsModule],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
