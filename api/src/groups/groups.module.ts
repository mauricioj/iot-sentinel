import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { Group, GroupSchema } from './schemas/group.schema';
import { ThingsModule } from '../things/things.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    forwardRef(() => ThingsModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}
