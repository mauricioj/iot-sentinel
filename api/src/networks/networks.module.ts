import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NetworksController } from './networks.controller';
import { NetworksService } from './networks.service';
import { NetworksRepository } from './networks.repository';
import { Network, NetworkSchema } from './schemas/network.schema';
import { LocalsModule } from '../locals/locals.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Network.name, schema: NetworkSchema }]),
    LocalsModule,
  ],
  controllers: [NetworksController],
  providers: [NetworksService, NetworksRepository],
  exports: [NetworksService],
})
export class NetworksModule {}
