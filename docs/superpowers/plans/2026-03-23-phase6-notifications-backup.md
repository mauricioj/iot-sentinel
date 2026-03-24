# Phase 6: Notifications & Backup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement in-app notifications with rules engine, WebSocket gateway for real-time push, and backup/restore with credential re-encryption — completing the IoT Sentinel platform.

**Architecture:** The notifications module owns schemas (NotificationRule, Notification), a service that evaluates rules on thing status changes, and a WebSocket gateway (Socket.IO) for real-time push. A `NotificationChannel` interface allows future channel implementations (email, Telegram). The backup module exports all collections to a password-protected .json.gz file with credential re-encryption, and restores from such files. The frontend gets a notifications dropdown in the header and a notifications/backup section in settings.

**Tech Stack:** NestJS (WebSockets/Socket.IO, @nestjs/platform-socket.io), zlib (gzip), existing CryptoService, Jest, existing frontend components

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

---

## File Structure

```
api/src/
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.service.spec.ts
│   ├── notifications.repository.ts
│   ├── notifications.gateway.ts         ← WebSocket (Socket.IO)
│   ├── dto/
│   │   ├── create-notification-rule.dto.ts
│   │   └── update-notification-rule.dto.ts
│   ├── schemas/
│   │   ├── notification-rule.schema.ts
│   │   └── notification.schema.ts
│   └── interfaces/
│       └── notification-channel.interface.ts
├── backup/
│   ├── backup.module.ts
│   ├── backup.controller.ts
│   ├── backup.service.ts
│   └── backup.service.spec.ts

frontend/src/
├── services/
│   └── notifications.service.ts
├── hooks/
│   └── use-websocket.ts
├── components/
│   └── layout/
│       └── notifications-dropdown.tsx
└── app/(dashboard)/
    └── notifications/
        └── page.tsx
```

---

### Task 1: Notification Schemas and Repository

**Files:**
- Create: `api/src/notifications/schemas/notification-rule.schema.ts`
- Create: `api/src/notifications/schemas/notification.schema.ts`
- Create: `api/src/notifications/notifications.repository.ts`

- [ ] **Step 1: Create notification-rule.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationRuleDocument = HydratedDocument<NotificationRule>;

export enum TargetType { THING = 'thing', GROUP = 'group', NETWORK = 'network', LOCAL = 'local' }
export enum RuleCondition { OFFLINE_DURATION = 'offline_duration', STATUS_CHANGE = 'status_change', NEW_DISCOVERY = 'new_discovery' }

@Schema({ timestamps: true })
export class NotificationRule {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: TargetType })
  targetType: TargetType;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ required: true, enum: RuleCondition })
  condition: RuleCondition;

  @Prop({ default: 300 })
  threshold: number;

  @Prop({ type: [String], default: ['in_app'] })
  channels: string[];

  @Prop({ default: true })
  enabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationRuleSchema = SchemaFactory.createForClass(NotificationRule);
```

- [ ] **Step 2: Create notification.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  THING_OFFLINE = 'thing_offline',
  THING_ONLINE = 'thing_online',
  NEW_DISCOVERY = 'new_discovery',
  SCAN_FAILED = 'scan_failed',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'NotificationRule' })
  ruleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Thing' })
  thingId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: [String], default: [] })
  sentTo: string[];

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ createdAt: -1 });
```

- [ ] **Step 3: Create notifications.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationRule, NotificationRuleDocument } from './schemas/notification-rule.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(NotificationRule.name) private readonly ruleModel: Model<NotificationRuleDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // Rules
  async createRule(data: Partial<NotificationRule>): Promise<NotificationRuleDocument> {
    return this.ruleModel.create({ ...data, targetId: new Types.ObjectId(data.targetId as any) });
  }

  async findAllRules(page: number, limit: number): Promise<{ data: NotificationRuleDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.ruleModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.ruleModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findRuleById(id: string): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findById(id).exec();
  }

  async updateRule(id: string, data: Partial<NotificationRule>): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteRule(id: string): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findByIdAndDelete(id).exec();
  }

  async findEnabledRules(): Promise<NotificationRuleDocument[]> {
    return this.ruleModel.find({ enabled: true }).exec();
  }

  // Notifications
  async createNotification(data: Partial<Notification>): Promise<NotificationDocument> {
    return this.notificationModel.create({
      ...data,
      thingId: data.thingId ? new Types.ObjectId(data.thingId as any) : undefined,
      ruleId: data.ruleId ? new Types.ObjectId(data.ruleId as any) : undefined,
    });
  }

  async findAllNotifications(page: number, limit: number): Promise<{ data: NotificationDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.notificationModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.notificationModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async markAsRead(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findByIdAndUpdate(id, { read: true }, { new: true }).exec();
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationModel.updateMany({ read: false }, { read: true }).exec();
  }

  async countUnread(): Promise<number> {
    return this.notificationModel.countDocuments({ read: false }).exec();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/notifications/
git commit -m "feat(notifications): add schemas and repository for rules and notifications"
```

---

### Task 2: Notification Service with Rules Engine (TDD)

**Files:**
- Create: `api/src/notifications/dto/create-notification-rule.dto.ts`
- Create: `api/src/notifications/dto/update-notification-rule.dto.ts`
- Create: `api/src/notifications/interfaces/notification-channel.interface.ts`
- Create: `api/src/notifications/notifications.service.spec.ts`
- Create: `api/src/notifications/notifications.service.ts`

- [ ] **Step 1: Create DTOs**

`create-notification-rule.dto.ts`:
```typescript
import { IsString, IsEnum, IsNumber, IsArray, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetType, RuleCondition } from '../schemas/notification-rule.schema';

export class CreateNotificationRuleDto {
  @ApiProperty({ example: 'Cameras offline > 5min' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty({ enum: RuleCondition })
  @IsEnum(RuleCondition)
  condition: RuleCondition;

  @ApiPropertyOptional({ default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @ApiPropertyOptional({ default: ['in_app'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
```

`update-notification-rule.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateNotificationRuleDto } from './create-notification-rule.dto';

export class UpdateNotificationRuleDto extends PartialType(CreateNotificationRuleDto) {}
```

- [ ] **Step 2: Create notification-channel.interface.ts**

```typescript
import { Notification } from '../schemas/notification.schema';

export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
```

- [ ] **Step 3: Write failing test**

```typescript
// api/src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from './schemas/notification.schema';

const mockRepository = {
  createRule: jest.fn(),
  findAllRules: jest.fn(),
  findRuleById: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
  findEnabledRules: jest.fn(),
  createNotification: jest.fn(),
  findAllNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  countUnread: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create a notification rule', async () => {
      const dto = { name: 'Test Rule', targetType: 'thing' as any, targetId: '123', condition: 'status_change' as any };
      mockRepository.createRule.mockResolvedValue({ _id: 'rule1', ...dto });
      const result = await service.createRule(dto);
      expect(result.name).toBe('Test Rule');
    });
  });

  describe('findRuleById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findRuleById.mockResolvedValue(null);
      await expect(service.findRuleById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('emit', () => {
    it('should create a notification', async () => {
      mockRepository.createNotification.mockResolvedValue({
        _id: 'n1', type: NotificationType.THING_OFFLINE, message: 'Camera went offline',
      });
      const result = await service.emit(NotificationType.THING_OFFLINE, 'Camera went offline', 'thing1', 'rule1');
      expect(result.type).toBe(NotificationType.THING_OFFLINE);
    });
  });

  describe('countUnread', () => {
    it('should return unread count', async () => {
      mockRepository.countUnread.mockResolvedValue(5);
      expect(await service.countUnread()).toBe(5);
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then implement**

```typescript
// api/src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationRule } from './schemas/notification-rule.schema';
import { Notification, NotificationType } from './schemas/notification.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  // Rules
  async createRule(dto: CreateNotificationRuleDto): Promise<NotificationRule> {
    return this.repository.createRule(dto);
  }

  async findAllRules(page: number, limit: number): Promise<PaginatedResponseDto<NotificationRule>> {
    const { data, total } = await this.repository.findAllRules(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findRuleById(id: string): Promise<NotificationRule> {
    const rule = await this.repository.findRuleById(id);
    if (!rule) throw new NotFoundException('Notification rule not found');
    return rule;
  }

  async updateRule(id: string, dto: UpdateNotificationRuleDto): Promise<NotificationRule> {
    const rule = await this.repository.updateRule(id, dto);
    if (!rule) throw new NotFoundException('Notification rule not found');
    return rule;
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.repository.deleteRule(id);
    if (!rule) throw new NotFoundException('Notification rule not found');
  }

  // Notifications
  async emit(type: NotificationType, message: string, thingId?: string, ruleId?: string): Promise<Notification> {
    return this.repository.createNotification({ type, message, thingId: thingId as any, ruleId: ruleId as any, sentTo: ['in_app'] });
  }

  async findAllNotifications(page: number, limit: number): Promise<PaginatedResponseDto<Notification>> {
    const { data, total } = await this.repository.findAllNotifications(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.repository.markAsRead(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllAsRead(): Promise<void> {
    await this.repository.markAllAsRead();
  }

  async countUnread(): Promise<number> {
    return this.repository.countUnread();
  }
}
```

- [ ] **Step 5: Run tests, verify pass**

- [ ] **Step 6: Commit**

```bash
git add api/src/notifications/
git commit -m "feat(notifications): add service with rules engine, DTOs, and channel interface"
```

---

### Task 3: WebSocket Gateway and Controller

**Files:**
- Create: `api/src/notifications/notifications.gateway.ts`
- Create: `api/src/notifications/notifications.controller.ts`
- Create: `api/src/notifications/notifications.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Install Socket.IO adapter**

```bash
cd api && npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

- [ ] **Step 2: Create notifications.gateway.ts**

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*' },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      this.logger.log(`Client connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data?.username || 'unknown'}`);
  }

  emitToAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  emitThingStatusChanged(data: { thingId: string; name: string; previousStatus: string; newStatus: string }) {
    this.emitToAll('thing:status_changed', { ...data, timestamp: new Date().toISOString() });
  }

  emitScanStarted(data: { jobId: string; networkId: string; type: string }) {
    this.emitToAll('scan:started', data);
  }

  emitScanCompleted(data: { jobId: string; networkId: string; newThings: number; updatedThings: number }) {
    this.emitToAll('scan:completed', data);
  }

  emitScanFailed(data: { jobId: string; networkId: string; error: string }) {
    this.emitToAll('scan:failed', data);
  }

  emitNewNotification(data: { notificationId: string; type: string; message: string; thingId?: string }) {
    this.emitToAll('notification:new', data);
  }
}
```

- [ ] **Step 3: Create notifications.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Rules
  @Post('notifications/rules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create notification rule' })
  createRule(@Body() dto: CreateNotificationRuleDto) {
    return this.notificationsService.createRule(dto);
  }

  @Get('notifications/rules')
  @ApiOperation({ summary: 'List notification rules' })
  findAllRules(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAllRules(query.page, query.limit);
  }

  @Patch('notifications/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update notification rule' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateNotificationRuleDto) {
    return this.notificationsService.updateRule(id, dto);
  }

  @Delete('notifications/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete notification rule' })
  deleteRule(@Param('id') id: string) {
    return this.notificationsService.deleteRule(id);
  }

  // Notifications
  @Get('notifications')
  @ApiOperation({ summary: 'List notifications' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAllNotifications(query.page, query.limit);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  countUnread() {
    return this.notificationsService.countUnread();
  }
}
```

- [ ] **Step 4: Create notifications.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRule, NotificationRuleSchema } from './schemas/notification-rule.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationRule.name, schema: NotificationRuleSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
```

- [ ] **Step 5: Add NotificationsModule to app.module.ts**

- [ ] **Step 6: Run `npx nest build` and `npx jest --verbose`**

- [ ] **Step 7: Commit**

```bash
git add api/src/notifications/ api/src/app.module.ts api/package*.json
git commit -m "feat(notifications): add WebSocket gateway, controller, and module"
```

---

### Task 4: Backup Service (TDD)

**Files:**
- Create: `api/src/backup/backup.service.spec.ts`
- Create: `api/src/backup/backup.service.ts`
- Create: `api/src/backup/backup.controller.ts`
- Create: `api/src/backup/backup.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// api/src/backup/backup.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { getModelToken } from '@nestjs/mongoose';
import { CryptoService } from '../crypto/crypto.service';

const mockModels = {
  settings: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  users: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  locals: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  networks: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  things: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  groups: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
  notificationRules: { find: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) },
};

const mockCryptoService = {
  decrypt: jest.fn((v: string) => `decrypted:${v}`),
  encrypt: jest.fn((v: string) => `encrypted:${v}`),
  encryptWithPassword: jest.fn((v: string) => `pw_encrypted:${v}`),
  decryptWithPassword: jest.fn((v: string) => v.replace('pw_encrypted:', '')),
};

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: getModelToken('Settings'), useValue: mockModels.settings },
        { provide: getModelToken('User'), useValue: mockModels.users },
        { provide: getModelToken('Local'), useValue: mockModels.locals },
        { provide: getModelToken('Network'), useValue: mockModels.networks },
        { provide: getModelToken('Thing'), useValue: mockModels.things },
        { provide: getModelToken('Group'), useValue: mockModels.groups },
        { provide: getModelToken('NotificationRule'), useValue: mockModels.notificationRules },
      ],
    }).compile();
    service = module.get<BackupService>(BackupService);
    jest.clearAllMocks();
  });

  describe('export', () => {
    it('should return a gzipped buffer with metadata', async () => {
      const result = await service.export('backup-password');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Implement backup.service.ts**

```typescript
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

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class BackupService {
  constructor(
    private readonly cryptoService: CryptoService,
    @InjectModel('Settings') private readonly settingsModel: Model<Settings>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Local') private readonly localModel: Model<Local>,
    @InjectModel('Network') private readonly networkModel: Model<Network>,
    @InjectModel('Thing') private readonly thingModel: Model<Thing>,
    @InjectModel('Group') private readonly groupModel: Model<Group>,
    @InjectModel('NotificationRule') private readonly ruleModel: Model<NotificationRule>,
  ) {}

  async export(password: string): Promise<Buffer> {
    const [settings, users, locals, networks, things, groups, rules] = await Promise.all([
      this.settingsModel.find().lean().exec(),
      this.userModel.find().select('-password').lean().exec(),
      this.localModel.find().lean().exec(),
      this.networkModel.find().lean().exec(),
      this.thingModel.find().lean().exec(),
      this.groupModel.find().lean().exec(),
      this.ruleModel.find().lean().exec(),
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
}
```

- [ ] **Step 3: Create backup.controller.ts**

```typescript
import { Controller, Post, Get, Body, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('api/v1/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('export')
  @ApiOperation({ summary: 'Export backup' })
  async exportBackup(@Body('password') password: string, @Res() res: Response) {
    const buffer = await this.backupService.export(password);
    const filename = `iot-sentinel-backup-${new Date().toISOString().split('T')[0]}.json.gz`;
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post('restore')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, password: { type: 'string' } } } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Restore from backup' })
  async restoreBackup(@UploadedFile() file: Express.Multer.File, @Body('password') password: string) {
    return this.backupService.restore(file.buffer, password);
  }
}
```

- [ ] **Step 4: Create backup.module.ts**

```typescript
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

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }), // 50MB max
    MongooseModule.forFeature([
      { name: 'Settings', schema: SettingsSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Local', schema: LocalSchema },
      { name: 'Network', schema: NetworkSchema },
      { name: 'Thing', schema: ThingSchema },
      { name: 'Group', schema: GroupSchema },
      { name: 'NotificationRule', schema: NotificationRuleSchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
```

- [ ] **Step 5: Install multer types**

```bash
cd api && npm install -D @types/multer
```

- [ ] **Step 6: Add BackupModule to app.module.ts, run tests and build**

- [ ] **Step 7: Commit**

```bash
git add api/src/backup/ api/src/app.module.ts api/package*.json
git commit -m "feat(backup): add export/restore with credential re-encryption"
```

---

### Task 5: Frontend — Notifications Dropdown and WebSocket Hook

**Files:**
- Create: `frontend/src/hooks/use-websocket.ts`
- Create: `frontend/src/services/notifications.service.ts`
- Create: `frontend/src/components/layout/notifications-dropdown.tsx`
- Modify: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Install socket.io-client**

```bash
cd frontend && npm install socket.io-client
```

- [ ] **Step 2: Create use-websocket.ts**

```typescript
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/services/api';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/ws';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => { socket.disconnect(); };
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { socket: socketRef.current, connected, on };
}
```

- [ ] **Step 3: Create notifications.service.ts**

```typescript
import { api } from './api';
import { PaginatedResponse } from '@/types';

export interface NotificationItem {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  thingId?: string;
  createdAt: string;
}

export interface NotificationRule {
  _id: string;
  name: string;
  targetType: string;
  targetId: string;
  condition: string;
  threshold: number;
  channels: string[];
  enabled: boolean;
}

export const notificationsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<NotificationItem>>(`/api/v1/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id: string) =>
    api(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () =>
    api('/api/v1/notifications/read-all', { method: 'POST' }),
  countUnread: () =>
    api<number>('/api/v1/notifications/unread-count'),
  // Rules
  findAllRules: (page = 1, limit = 20) =>
    api<PaginatedResponse<NotificationRule>>(`/api/v1/notifications/rules?page=${page}&limit=${limit}`),
  createRule: (data: Partial<NotificationRule>) =>
    api<NotificationRule>('/api/v1/notifications/rules', { method: 'POST', body: JSON.stringify(data) }),
  deleteRule: (id: string) =>
    api(`/api/v1/notifications/rules/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 4: Create notifications-dropdown.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { notificationsService, NotificationItem } from '@/services/notifications.service';
import { useWebSocket } from '@/hooks/use-websocket';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { on } = useWebSocket();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const cleanup = on('notification:new', () => {
      loadNotifications();
      loadUnreadCount();
    });
    return cleanup;
  }, [on]);

  const loadNotifications = async () => {
    try {
      const res = await notificationsService.findAll(1, 10);
      setNotifications(res.data);
    } catch {}
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.countUnread();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead();
    setUnreadCount(0);
    loadNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border-b border-border px-4 py-3 text-sm last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <p className="text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update header.tsx to use NotificationsDropdown**

Replace the static Bell button in `frontend/src/components/layout/header.tsx` with:
```tsx
import { NotificationsDropdown } from './notifications-dropdown';
// Replace the Bell button with:
<NotificationsDropdown />
```

- [ ] **Step 6: Verify build, commit**

```bash
git add frontend/
git commit -m "feat(frontend): add notifications dropdown with WebSocket real-time updates"
```

---

### Task 6: Frontend — Notifications Page

**Files:**
- Create: `frontend/src/app/(dashboard)/notifications/page.tsx`

- [ ] **Step 1: Create notifications page**

Page features:
- Two tabs/sections: "Notifications" list and "Rules" management
- Notifications section: list of all notifications with type badge, message, timestamp, read/unread status. Mark as read on click.
- Rules section: DataTable of rules (name, target type, condition, threshold, enabled toggle). Create rule modal (name, targetType select, targetId, condition select, threshold input, channels checkboxes). Delete rule.

- [ ] **Step 2: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/notifications/
git commit -m "feat(frontend): add notifications page with rules management"
```

---

### Task 7: Final Build Verification

- [ ] **Step 1: Run all NestJS tests**

```bash
cd api && npx jest --verbose
```

- [ ] **Step 2: Run NestJS build**

```bash
cd api && npx nest build
```

- [ ] **Step 3: Run frontend build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Docker build all services**

```bash
docker compose build
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "chore: Phase 6 final verification and fixes"
```

---

## Phase Summary

After completing this plan, you will have:
- **NotificationRule** CRUD at `/api/v1/notifications/rules`
- **Notification** list/read at `/api/v1/notifications`
- **WebSocket gateway** at `/ws` with JWT auth and events: thing:status_changed, scan:started/completed/failed, notification:new
- **NotificationChannel interface** ready for future email/Telegram/webhook implementations
- **Backup export** at `POST /api/v1/backup/export` — password-protected .json.gz with credential re-encryption
- **Backup restore** at `POST /api/v1/backup/restore` — upload file + password
- **Frontend notifications dropdown** with real-time WebSocket updates and unread badge
- **Frontend notifications page** with rules management
- **IoT Sentinel v1.0 complete**

## Project Complete

All 6 phases implemented:
1. Foundation (Auth, Crypto, Settings)
2. Core API (Locals, Networks, Things, Groups, Dashboard)
3. Scanner (Python worker, Bull queue, Monitor)
4. Frontend Foundation (Next.js, Dark theme, App shell, Login, Setup)
5. Frontend CRUD (All pages, Network Map)
6. Notifications & Backup (WebSocket, Rules, Export/Restore)
