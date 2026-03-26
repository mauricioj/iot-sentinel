import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThingsController } from './things.controller';
import { ThingsService } from './things.service';
import { ThingsRepository } from './things.repository';
import { Thing, ThingSchema } from './schemas/thing.schema';
import { NetworksModule } from '../networks/networks.module';
import { StatusHistoryModule } from '../status-history/status-history.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Thing.name, schema: ThingSchema }]),
    NetworksModule,
    StatusHistoryModule,
  ],
  controllers: [ThingsController],
  providers: [ThingsService, ThingsRepository],
  exports: [ThingsService, ThingsRepository],
})
export class ThingsModule {}
