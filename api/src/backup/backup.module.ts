import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { Settings, SettingsSchema } from '../settings/schemas/settings.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Local, LocalSchema } from '../locals/schemas/local.schema';
import { Network, NetworkSchema } from '../networks/schemas/network.schema';
import { Thing, ThingSchema } from '../things/schemas/thing.schema';
import { Group, GroupSchema } from '../groups/schemas/group.schema';
import { NotificationRule, NotificationRuleSchema } from '../notifications/schemas/notification-rule.schema';
import { ThingType, ThingTypeSchema } from '../thing-types/schemas/thing-type.schema';
import { StatusEvent, StatusEventSchema } from '../status-history/schemas/status-event.schema';

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }), // 50MB max
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: User.name, schema: UserSchema },
      { name: Local.name, schema: LocalSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: Thing.name, schema: ThingSchema },
      { name: Group.name, schema: GroupSchema },
      { name: NotificationRule.name, schema: NotificationRuleSchema },
      { name: ThingType.name, schema: ThingTypeSchema },
      { name: StatusEvent.name, schema: StatusEventSchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
