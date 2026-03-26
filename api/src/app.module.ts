import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CommonModule } from './common/common.module';
import { CryptoModule } from './crypto/crypto.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { LocalsModule } from './locals/locals.module';
import { NetworksModule } from './networks/networks.module';
import { GroupsModule } from './groups/groups.module';
import { ThingTypesModule } from './thing-types/thing-types.module';
import { ThingsModule } from './things/things.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScannerModule } from './scanner/scanner.module';
import { MonitorModule } from './monitor/monitor.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BackupModule } from './backup/backup.module';
import { StatusHistoryModule } from './status-history/status-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    CryptoModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    LocalsModule,
    NetworksModule,
    GroupsModule,
    ThingTypesModule,
    ThingsModule,
    DashboardModule,
    ScannerModule,
    MonitorModule,
    NotificationsModule,
    BackupModule,
    StatusHistoryModule,
  ],
})
export class AppModule {}
