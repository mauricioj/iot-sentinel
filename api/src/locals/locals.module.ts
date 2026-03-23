import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocalsController } from './locals.controller';
import { LocalsService } from './locals.service';
import { LocalsRepository } from './locals.repository';
import { Local, LocalSchema } from './schemas/local.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Local.name, schema: LocalSchema }])],
  controllers: [LocalsController],
  providers: [LocalsService, LocalsRepository],
  exports: [LocalsService, LocalsRepository],
})
export class LocalsModule {}
