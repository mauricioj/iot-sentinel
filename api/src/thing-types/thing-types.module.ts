import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThingTypesController } from './thing-types.controller';
import { ThingTypesService } from './thing-types.service';
import { ThingTypesRepository } from './thing-types.repository';
import { ThingType, ThingTypeSchema } from './schemas/thing-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ThingType.name, schema: ThingTypeSchema }]),
  ],
  controllers: [ThingTypesController],
  providers: [ThingTypesService, ThingTypesRepository],
  exports: [ThingTypesService, ThingTypesRepository],
})
export class ThingTypesModule {}
