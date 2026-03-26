import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { CryptoService } from '../crypto/crypto.service';
import { Settings } from '../settings/schemas/settings.schema';
import { User } from '../users/schemas/user.schema';
import { Local } from '../locals/schemas/local.schema';
import { Network } from '../networks/schemas/network.schema';
import { Thing } from '../things/schemas/thing.schema';
import { Group } from '../groups/schemas/group.schema';
import { NotificationRule } from '../notifications/schemas/notification-rule.schema';
import { ThingType } from '../thing-types/schemas/thing-type.schema';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class BackupService {
  constructor(
    private readonly cryptoService: CryptoService,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Local.name) private readonly localModel: Model<Local>,
    @InjectModel(Network.name) private readonly networkModel: Model<Network>,
    @InjectModel(Thing.name) private readonly thingModel: Model<Thing>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(NotificationRule.name) private readonly ruleModel: Model<NotificationRule>,
    @InjectModel(ThingType.name) private readonly thingTypeModel: Model<ThingType>,
  ) {}

  async export(password: string): Promise<Buffer> {
    const [settings, users, locals, networks, things, groups, rules, thingTypes] = await Promise.all([
      this.settingsModel.find().lean().exec(),
      this.userModel.find().select('-password').lean().exec(),
      this.localModel.find().lean().exec(),
      this.networkModel.find().lean().exec(),
      this.thingModel.find().lean().exec(),
      this.groupModel.find().lean().exec(),
      this.ruleModel.find().lean().exec(),
      this.thingTypeModel.find().lean().exec(),
    ]);

    // Re-encrypt credentials with backup password
    const processedThings = things.map((thing: any) => {
      if (thing.credentials) {
        const creds = { ...thing.credentials };
        if (creds.username) creds.username = this.cryptoService.encryptWithPassword(this.cryptoService.decrypt(creds.username), password);
        if (creds.password) creds.password = this.cryptoService.encryptWithPassword(this.cryptoService.decrypt(creds.password), password);
        if (creds.notes) creds.notes = this.cryptoService.encryptWithPassword(this.cryptoService.decrypt(creds.notes), password);
        return { ...thing, credentials: creds };
      }
      return thing;
    });

    const backup = {
      metadata: { version: '1.0.0', exportDate: new Date().toISOString() },
      settings,
      users,
      locals,
      networks,
      things: processedThings,
      groups,
      notificationRules: rules,
      thingTypes,
    };

    const json = JSON.stringify(backup);
    return gzip(Buffer.from(json)) as Promise<Buffer>;
  }

  async restore(data: Buffer, password: string): Promise<{ imported: Record<string, number> }> {
    const jsonBuffer = await gunzip(data);
    const backup = JSON.parse(jsonBuffer.toString());

    // Re-encrypt credentials with instance key
    const processedThings = (backup.things || []).map((thing: any) => {
      if (thing.credentials) {
        const creds = { ...thing.credentials };
        if (creds.username) creds.username = this.cryptoService.encrypt(this.cryptoService.decryptWithPassword(creds.username, password));
        if (creds.password) creds.password = this.cryptoService.encrypt(this.cryptoService.decryptWithPassword(creds.password, password));
        if (creds.notes) creds.notes = this.cryptoService.encrypt(this.cryptoService.decryptWithPassword(creds.notes, password));
        return { ...thing, credentials: creds };
      }
      return thing;
    });

    // Clear and import
    const counts: Record<string, number> = {};

    if (backup.thingTypes?.length) {
      await this.thingTypeModel.deleteMany({});
      await this.thingTypeModel.insertMany(backup.thingTypes);
      counts.thingTypes = backup.thingTypes.length;
    }

    if (backup.locals?.length) {
      await this.localModel.deleteMany({});
      await this.localModel.insertMany(backup.locals);
      counts.locals = backup.locals.length;
    }
    if (backup.networks?.length) {
      await this.networkModel.deleteMany({});
      await this.networkModel.insertMany(backup.networks);
      counts.networks = backup.networks.length;
    }
    if (processedThings.length) {
      await this.thingModel.deleteMany({});
      await this.thingModel.insertMany(processedThings);
      counts.things = processedThings.length;
    }
    if (backup.groups?.length) {
      await this.groupModel.deleteMany({});
      await this.groupModel.insertMany(backup.groups);
      counts.groups = backup.groups.length;
    }
    if (backup.notificationRules?.length) {
      await this.ruleModel.deleteMany({});
      await this.ruleModel.insertMany(backup.notificationRules);
      counts.notificationRules = backup.notificationRules.length;
    }

    return { imported: counts };
  }

  async restoreFull(data: Buffer, password: string): Promise<{ imported: Record<string, number> }> {
    const result = await this.restore(data, password);
    const jsonBuffer = await gunzip(data);
    const backup = JSON.parse(jsonBuffer.toString());

    // Also restore settings and users (for setup wizard restore)
    if (backup.settings?.length) {
      await this.settingsModel.deleteMany({});
      await this.settingsModel.insertMany(backup.settings);
      result.imported.settings = backup.settings.length;
    }
    if (backup.users?.length) {
      await this.userModel.deleteMany({});
      await this.userModel.insertMany(backup.users);
      result.imported.users = backup.users.length;
    }

    return result;
  }

  async isSetupComplete(): Promise<boolean> {
    const settings = await this.settingsModel.findOne().lean().exec();
    return !!settings?.setupCompleted;
  }
}
