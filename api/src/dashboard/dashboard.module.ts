import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ThingsModule } from '../things/things.module';
import { LocalsModule } from '../locals/locals.module';
import { StatusHistoryModule } from '../status-history/status-history.module';

@Module({
  imports: [ThingsModule, LocalsModule, StatusHistoryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
