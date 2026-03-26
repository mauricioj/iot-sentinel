import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { ThingsModule } from '../things/things.module';
import { NetworksModule } from '../networks/networks.module';
import { StatusHistoryModule } from '../status-history/status-history.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ScheduleModule.forRoot(), ThingsModule, NetworksModule, StatusHistoryModule, SettingsModule],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
