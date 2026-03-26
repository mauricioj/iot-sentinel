import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusEvent, StatusEventSchema } from './schemas/status-event.schema';
import { StatusHistoryRepository } from './status-history.repository';
import { StatusHistoryService } from './status-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StatusEvent.name, schema: StatusEventSchema }]),
  ],
  providers: [StatusHistoryService, StatusHistoryRepository],
  exports: [StatusHistoryService, StatusHistoryRepository],
})
export class StatusHistoryModule {}
