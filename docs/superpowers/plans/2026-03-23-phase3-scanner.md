# Phase 3: Scanner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the network scanning system — a Python worker that executes nmap scans via Bull queue, a NestJS scanner module that orchestrates jobs with rate limiting, a monitor module for periodic status checks, and result processing that creates/updates Things automatically.

**Architecture:** NestJS enqueues scan jobs into Redis/Bull. A Python worker consumes jobs, runs nmap, and writes results as Bull job completion payloads. NestJS listens for completion events and processes results (MAC matching, Thing creation/updates, status changes). The scanner module enforces rate limits (max concurrent scans, cooldown). The monitor module uses NestJS `@Cron` to schedule periodic status checks. On non-Linux platforms, the worker runs in mock mode.

**Tech Stack:** NestJS (Bull queue, @nestjs/schedule), Python 3.11 (python-nmap, redis/bull), Docker (network_mode: host), Jest, Pytest

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

---

## File Structure

```
api/src/
├── scanner/
│   ├── scanner.module.ts
│   ├── scanner.controller.ts
│   ├── scanner.service.ts
│   ├── scanner.service.spec.ts
│   ├── scanner.repository.ts
│   ├── scanner.processor.ts          ← Bull job completion listener
│   ├── dto/
│   │   └── discover.dto.ts
│   └── schemas/
│       └── scan-job.schema.ts
├── monitor/
│   ├── monitor.module.ts
│   ├── monitor.controller.ts
│   └── monitor.service.ts

worker/
├── Dockerfile
├── Dockerfile.dev
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── main.py                       ← Entry point, Bull queue consumer
│   ├── scanner.py                    ← nmap wrapper
│   ├── mock_scanner.py               ← Mock mode for non-Linux
│   └── config.py                     ← Redis/env configuration
├── tests/
│   ├── __init__.py
│   └── test_scanner.py               ← Pytest for nmap result parsing
└── .dockerignore

docker-compose.yml                    ← Add worker service
docker-compose.dev.yml                ← Add worker dev overrides
```

---

### Task 1: ScanJob Schema and Scanner Repository

**Files:**
- Create: `api/src/scanner/schemas/scan-job.schema.ts`
- Create: `api/src/scanner/scanner.repository.ts`

- [ ] **Step 1: Create scan-job.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScanJobDocument = HydratedDocument<ScanJob>;

export enum ScanType {
  DISCOVERY = 'discovery',
  STATUS_CHECK = 'status_check',
  DEEP_SCAN = 'deep_scan',
}

export enum ScanStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ScanTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

@Schema({ _id: false })
export class DiscoveredPort {
  @Prop({ required: true })
  port: number;

  @Prop({ default: 'tcp' })
  protocol: string;

  @Prop({ default: '' })
  service: string;

  @Prop({ default: '' })
  version: string;
}

@Schema({ _id: false })
export class DiscoveredHost {
  @Prop({ default: '' })
  macAddress: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ default: '' })
  hostname: string;

  @Prop({ type: [DiscoveredPort], default: [] })
  ports: DiscoveredPort[];

  @Prop({ default: false })
  isNew: boolean;
}

@Schema({ timestamps: true })
export class ScanJob {
  @Prop({ type: Types.ObjectId, ref: 'Network', required: true })
  networkId: Types.ObjectId;

  @Prop({ required: true, enum: ScanType })
  type: ScanType;

  @Prop({ required: true, enum: ScanStatus, default: ScanStatus.QUEUED })
  status: ScanStatus;

  @Prop({ required: true, enum: ScanTrigger })
  triggeredBy: ScanTrigger;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId: Types.ObjectId | null;

  @Prop({ type: Date })
  startedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: [DiscoveredHost], default: [] })
  results: DiscoveredHost[];

  @Prop({ default: '' })
  error: string;

  createdAt: Date;
}

export const ScanJobSchema = SchemaFactory.createForClass(ScanJob);
ScanJobSchema.index({ networkId: 1, status: 1 });
```

- [ ] **Step 2: Create scanner.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScanJob, ScanJobDocument, ScanStatus } from './schemas/scan-job.schema';

@Injectable()
export class ScannerRepository {
  constructor(@InjectModel(ScanJob.name) private readonly scanJobModel: Model<ScanJobDocument>) {}

  async create(data: Partial<ScanJob>): Promise<ScanJobDocument> {
    return this.scanJobModel.create({
      ...data,
      networkId: new Types.ObjectId(data.networkId as unknown as string),
      userId: data.userId ? new Types.ObjectId(data.userId as unknown as string) : null,
    });
  }

  async findById(id: string): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findById(id).exec();
  }

  async findAll(page: number, limit: number): Promise<{ data: ScanJobDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.scanJobModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.scanJobModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async updateStatus(id: string, status: ScanStatus, extra?: Partial<ScanJob>): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findByIdAndUpdate(id, { status, ...extra }, { new: true }).exec();
  }

  async hasActiveScans(networkId: string): Promise<boolean> {
    const count = await this.scanJobModel.countDocuments({
      networkId: new Types.ObjectId(networkId),
      status: { $in: [ScanStatus.QUEUED, ScanStatus.RUNNING] },
    }).exec();
    return count > 0;
  }

  async getLastCompletedScan(networkId: string): Promise<ScanJobDocument | null> {
    return this.scanJobModel.findOne({
      networkId: new Types.ObjectId(networkId),
      status: ScanStatus.COMPLETED,
    }).sort({ completedAt: -1 }).exec();
  }

  async countPending(): Promise<number> {
    return this.scanJobModel.countDocuments({ status: ScanStatus.QUEUED }).exec();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/scanner/
git commit -m "feat(scanner): add ScanJob schema and repository"
```

---

### Task 2: Scanner Service with Rate Limiting (TDD)

**Files:**
- Create: `api/src/scanner/dto/discover.dto.ts`
- Create: `api/src/scanner/scanner.service.spec.ts`
- Create: `api/src/scanner/scanner.service.ts`

- [ ] **Step 1: Create discover.dto.ts**

```typescript
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanType } from '../schemas/scan-job.schema';

export class DiscoverDto {
  @ApiProperty({ description: 'Network ID to scan' })
  @IsString()
  networkId: string;

  @ApiPropertyOptional({ enum: ScanType, default: ScanType.DISCOVERY })
  @IsOptional()
  @IsEnum(ScanType)
  type?: ScanType;
}
```

- [ ] **Step 2: Write failing test for scanner service**

```typescript
// api/src/scanner/scanner.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerRepository } from './scanner.repository';
import { NetworksService } from '../networks/networks.service';
import { SettingsService } from '../settings/settings.service';
import { ScanType, ScanTrigger, ScanStatus } from './schemas/scan-job.schema';

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  hasActiveScans: jest.fn(),
  getLastCompletedScan: jest.fn(),
  countPending: jest.fn(),
  updateStatus: jest.fn(),
};

const mockNetworksService = {
  findById: jest.fn(),
};

const mockSettingsService = {
  get: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('ScannerService', () => {
  let service: ScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        { provide: ScannerRepository, useValue: mockRepository },
        { provide: NetworksService, useValue: mockNetworksService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: getQueueToken('scanner'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
    jest.clearAllMocks();
  });

  describe('discover', () => {
    it('should create scan job and enqueue', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockRepository.getLastCompletedScan.mockResolvedValue(null);
      mockRepository.countPending.mockResolvedValue(0);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });
      mockRepository.create.mockResolvedValue({ _id: 'job1', status: ScanStatus.QUEUED });
      mockQueue.add.mockResolvedValue({});

      const result = await service.discover('net1', ScanType.DISCOVERY, 'user1');
      expect(result.status).toBe(ScanStatus.QUEUED);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should reject if network has active scan', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(true);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });

    it('should reject if cooldown not elapsed', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });
      mockRepository.getLastCompletedScan.mockResolvedValue({
        completedAt: new Date(), // just completed — cooldown not elapsed
      });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });

    it('should reject if queue is full', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1', cidr: '192.168.1.0/24' });
      mockRepository.hasActiveScans.mockResolvedValue(false);
      mockRepository.getLastCompletedScan.mockResolvedValue(null);
      mockRepository.countPending.mockResolvedValue(10);
      mockSettingsService.get.mockResolvedValue({ scanner: { maxConcurrentScans: 1, cooldownSeconds: 60 } });

      await expect(service.discover('net1', ScanType.DISCOVERY, 'user1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd api && npx jest src/scanner/scanner.service.spec.ts --verbose
```

- [ ] **Step 4: Implement scanner.service.ts**

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScannerRepository } from './scanner.repository';
import { NetworksService } from '../networks/networks.service';
import { SettingsService } from '../settings/settings.service';
import { ScanJob, ScanType, ScanStatus, ScanTrigger } from './schemas/scan-job.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

const MAX_QUEUE_DEPTH = 10;

@Injectable()
export class ScannerService {
  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly networksService: NetworksService,
    private readonly settingsService: SettingsService,
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
  ) {}

  async discover(networkId: string, type: ScanType = ScanType.DISCOVERY, userId?: string): Promise<ScanJob> {
    const network = await this.networksService.findById(networkId);
    const settings = await this.settingsService.get();
    const { maxConcurrentScans, cooldownSeconds } = settings.scanner;

    // Rate limiting: check active scans
    const hasActive = await this.scannerRepository.hasActiveScans(networkId);
    if (hasActive) {
      throw new ConflictException('A scan is already running or queued for this network');
    }

    // Rate limiting: check cooldown
    const lastScan = await this.scannerRepository.getLastCompletedScan(networkId);
    if (lastScan?.completedAt) {
      const elapsed = (Date.now() - lastScan.completedAt.getTime()) / 1000;
      if (elapsed < cooldownSeconds) {
        throw new ConflictException(
          `Cooldown active. Wait ${Math.ceil(cooldownSeconds - elapsed)}s before scanning this network again`,
        );
      }
    }

    // Rate limiting: check global queue depth
    const pendingCount = await this.scannerRepository.countPending();
    if (pendingCount >= MAX_QUEUE_DEPTH) {
      throw new ConflictException('Scan queue is full. Try again later');
    }

    // Create job record
    const scanJob = await this.scannerRepository.create({
      networkId: networkId as any,
      type,
      status: ScanStatus.QUEUED,
      triggeredBy: userId ? ScanTrigger.MANUAL : ScanTrigger.SCHEDULED,
      userId: userId as any || null,
    });

    // Enqueue Bull job
    await this.scannerQueue.add(type, {
      jobId: scanJob._id.toString(),
      networkId,
      cidr: (network as any).cidr,
      type,
    });

    return scanJob;
  }

  async findById(id: string): Promise<ScanJob> {
    const job = await this.scannerRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Scan job not found');
    }
    return job;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<ScanJob>> {
    const { data, total } = await this.scannerRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd api && npx jest src/scanner/scanner.service.spec.ts --verbose
```
Expected: 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/scanner/
git commit -m "feat(scanner): add service with rate limiting, DTOs, and tests"
```

---

### Task 3: Scanner Bull Processor (Job Completion Listener)

**Files:**
- Create: `api/src/scanner/scanner.processor.ts`

This processor listens for completed Bull jobs and processes scan results — matching MACs to existing Things, creating "discovered" Things for new MACs, and updating status.

- [ ] **Step 1: Create scanner.processor.ts**

```typescript
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScannerRepository } from './scanner.repository';
import { ThingsRepository } from '../things/things.repository';
import { ScanStatus, ScanType, DiscoveredHost } from './schemas/scan-job.schema';
import { ThingStatus } from '../things/schemas/thing.schema';

@Processor('scanner')
export class ScannerProcessor {
  private readonly logger = new Logger(ScannerProcessor.name);

  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly thingsRepository: ThingsRepository,
  ) {}

  @Process('discovery')
  async handleDiscovery(job: Job) {
    this.logger.log(`Processing discovery job ${job.data.jobId} for ${job.data.cidr}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    // The actual scan is done by the Python worker.
    // This process handler is a placeholder — the real work happens in @OnQueueCompleted.
    // In production, the Python worker consumes directly from Redis.
    // For the NestJS side, we only listen for completion events.
    return job.data;
  }

  @Process('status_check')
  async handleStatusCheck(job: Job) {
    this.logger.log(`Processing status_check job ${job.data.jobId}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    return job.data;
  }

  @Process('deep_scan')
  async handleDeepScan(job: Job) {
    this.logger.log(`Processing deep_scan job ${job.data.jobId}`);
    await this.scannerRepository.updateStatus(job.data.jobId, ScanStatus.RUNNING, {
      startedAt: new Date(),
    });
    return job.data;
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    if (!result?.hosts) return;

    const { jobId, networkId } = job.data;
    const hosts: DiscoveredHost[] = result.hosts;
    this.logger.log(`Scan job ${jobId} completed with ${hosts.length} hosts found`);

    // Process each discovered host
    const processedHosts: DiscoveredHost[] = [];
    for (const host of hosts) {
      const existing = host.macAddress
        ? await this.thingsRepository.findByMacAddress(host.macAddress)
        : null;

      if (existing) {
        // Update existing thing
        await this.thingsRepository.update(existing._id.toString(), {
          ipAddress: host.ipAddress,
          hostname: host.hostname || existing.hostname,
          status: ThingStatus.ONLINE,
          lastSeenAt: new Date(),
          ports: host.ports as any,
        } as any);
        processedHosts.push({ ...host, isNew: false });
      } else {
        // Create discovered thing
        await this.thingsRepository.create({
          networkId,
          name: host.hostname || host.ipAddress,
          type: 'other' as any,
          macAddress: host.macAddress || undefined,
          ipAddress: host.ipAddress,
          hostname: host.hostname,
          ports: host.ports as any,
        } as any);
        processedHosts.push({ ...host, isNew: true });
      }
    }

    // Update scan job with results
    await this.scannerRepository.updateStatus(jobId, ScanStatus.COMPLETED, {
      completedAt: new Date(),
      results: processedHosts,
    });
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    const { jobId } = job.data;
    this.logger.error(`Scan job ${jobId} failed: ${error.message}`);
    await this.scannerRepository.updateStatus(jobId, ScanStatus.FAILED, {
      completedAt: new Date(),
      error: error.message,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/scanner/scanner.processor.ts
git commit -m "feat(scanner): add Bull processor for job completion and result processing"
```

---

### Task 4: Scanner Controller and Module

**Files:**
- Create: `api/src/scanner/scanner.controller.ts`
- Create: `api/src/scanner/scanner.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create scanner.controller.ts**

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScannerService } from './scanner.service';
import { DiscoverDto } from './dto/discover.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('api/v1/scanner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('discover')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Start a network scan' })
  discover(@Body() dto: DiscoverDto, @CurrentUser('userId') userId: string) {
    return this.scannerService.discover(dto.networkId, dto.type, userId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List scan jobs' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.scannerService.findAll(query.page, query.limit);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get scan job by ID' })
  findOne(@Param('id') id: string) {
    return this.scannerService.findById(id);
  }
}
```

- [ ] **Step 2: Create scanner.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { ScannerRepository } from './scanner.repository';
import { ScannerProcessor } from './scanner.processor';
import { ScanJob, ScanJobSchema } from './schemas/scan-job.schema';
import { NetworksModule } from '../networks/networks.module';
import { ThingsModule } from '../things/things.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ScanJob.name, schema: ScanJobSchema }]),
    BullModule.registerQueue({ name: 'scanner' }),
    NetworksModule,
    ThingsModule,
    SettingsModule,
  ],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerRepository, ScannerProcessor],
  exports: [ScannerService],
})
export class ScannerModule {}
```

- [ ] **Step 3: Add ScannerModule to app.module.ts**

```typescript
import { ScannerModule } from './scanner/scanner.module';
// Add to imports array
```

- [ ] **Step 4: Run `npx nest build` to verify compilation**

- [ ] **Step 5: Run all tests**

```bash
cd api && npx jest --verbose
```

- [ ] **Step 6: Commit**

```bash
git add api/src/scanner/ api/src/app.module.ts
git commit -m "feat(scanner): add controller, module, and Bull queue wiring"
```

---

### Task 5: Monitor Module (Periodic Status Checks)

**Files:**
- Create: `api/src/monitor/monitor.service.ts`
- Create: `api/src/monitor/monitor.controller.ts`
- Create: `api/src/monitor/monitor.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Install @nestjs/schedule**

```bash
cd api && npm install @nestjs/schedule
```

- [ ] **Step 2: Create monitor.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ThingsRepository } from '../things/things.repository';
import { ScannerService } from '../scanner/scanner.service';
import { NetworksService } from '../networks/networks.service';
import { SettingsService } from '../settings/settings.service';
import { ScanType } from '../scanner/schemas/scan-job.schema';
import { ThingStatus } from '../things/schemas/thing.schema';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly scannerService: ScannerService,
    private readonly settingsService: SettingsService,
  ) {}

  async getStatus() {
    const statusCounts = await this.thingsRepository.countByStatus();
    const total = await this.thingsRepository.countTotal();

    return {
      total,
      online: statusCounts['online'] || 0,
      offline: statusCounts['offline'] || 0,
      unknown: statusCounts['unknown'] || 0,
      discovered: statusCounts['discovered'] || 0,
    };
  }

  async checkThing(thingId: string) {
    // Mark a single thing for immediate status check
    // In v1, this just returns current status
    // Future: enqueue a targeted ping job
    const thing = await this.thingsRepository.findById(thingId);
    if (!thing) {
      return { status: 'not_found' };
    }
    return {
      id: thing._id,
      name: thing.name,
      status: thing.status,
      lastSeenAt: thing.lastSeenAt,
    };
  }
}
```

- [ ] **Step 3: Create monitor.controller.ts**

```typescript
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Monitor')
@ApiBearerAuth()
@Controller('api/v1/monitor')
@UseGuards(JwtAuthGuard)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get overall monitoring status' })
  getStatus() {
    return this.monitorService.getStatus();
  }

  @Post('check/:thingId')
  @ApiOperation({ summary: 'Check status of a specific thing' })
  checkThing(@Param('thingId') thingId: string) {
    return this.monitorService.checkThing(thingId);
  }
}
```

- [ ] **Step 4: Create monitor.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { ThingsModule } from '../things/things.module';
import { ScannerModule } from '../scanner/scanner.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThingsModule,
    ScannerModule,
    SettingsModule,
  ],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
```

- [ ] **Step 5: Add MonitorModule to app.module.ts**

- [ ] **Step 6: Run `npx nest build` and all tests**

- [ ] **Step 7: Commit**

```bash
git add api/src/monitor/ api/src/app.module.ts api/package*.json
git commit -m "feat(monitor): add status endpoint and monitoring module"
```

---

### Task 6: Python Worker — Project Setup

**Files:**
- Create: `worker/requirements.txt`
- Create: `worker/src/__init__.py`
- Create: `worker/src/config.py`
- Create: `worker/.dockerignore`
- Create: `worker/Dockerfile`
- Create: `worker/Dockerfile.dev`

- [ ] **Step 1: Create requirements.txt**

```
python-nmap==0.7.1
redis==5.0.1
```

- [ ] **Step 2: Create config.py**

```python
import os

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MOCK_MODE = os.getenv('SCANNER_MOCK_MODE', 'false').lower() == 'true'
QUEUE_NAME = 'bull:scanner'
```

- [ ] **Step 3: Create .dockerignore**

```
__pycache__
*.pyc
.venv
.env
tests
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y nmap && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["python", "-m", "src.main"]
```

- [ ] **Step 5: Create Dockerfile.dev**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y nmap && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["python", "-m", "src.main"]
```

- [ ] **Step 6: Create src/__init__.py** (empty file)

- [ ] **Step 7: Commit**

```bash
git add worker/
git commit -m "feat(worker): add Python project setup with Dockerfile and config"
```

---

### Task 7: Python Worker — Scanner and Mock Mode

**Files:**
- Create: `worker/src/scanner.py`
- Create: `worker/src/mock_scanner.py`
- Create: `worker/tests/__init__.py`
- Create: `worker/tests/test_scanner.py`

- [ ] **Step 1: Create scanner.py**

```python
"""Real nmap scanner — requires nmap installed and NET_ADMIN capabilities."""
import nmap
import logging

logger = logging.getLogger(__name__)


def scan_network(cidr: str, scan_type: str = 'discovery') -> list[dict]:
    """
    Run nmap scan on a CIDR range.
    Returns list of discovered hosts with MAC, IP, hostname, ports.
    """
    nm = nmap.PortScanner()

    if scan_type == 'discovery':
        # Service version detection
        logger.info(f"Running discovery scan on {cidr}")
        nm.scan(hosts=cidr, arguments='-sn -sV --max-retries 1 --host-timeout 30s')
    elif scan_type == 'status_check':
        # Ping sweep only
        logger.info(f"Running status check on {cidr}")
        nm.scan(hosts=cidr, arguments='-sn --max-retries 1 --host-timeout 10s')
    elif scan_type == 'deep_scan':
        # Full port scan + OS detection
        logger.info(f"Running deep scan on {cidr}")
        nm.scan(hosts=cidr, arguments='-sV -O --max-retries 2 --host-timeout 60s')
    else:
        raise ValueError(f"Unknown scan type: {scan_type}")

    return parse_nmap_results(nm)


def parse_nmap_results(nm: nmap.PortScanner) -> list[dict]:
    """Parse nmap scan results into a structured format."""
    hosts = []

    for host_ip in nm.all_hosts():
        host_info = nm[host_ip]

        # Extract MAC address
        mac = ''
        if 'mac' in host_info.get('addresses', {}):
            mac = host_info['addresses']['mac']

        # Extract hostname
        hostname = ''
        if host_info.get('hostnames'):
            hostname = host_info['hostnames'][0].get('name', '')

        # Extract ports
        ports = []
        for proto in host_info.all_protocols():
            for port_num in host_info[proto]:
                port_info = host_info[proto][port_num]
                if port_info.get('state') == 'open':
                    ports.append({
                        'port': port_num,
                        'protocol': proto,
                        'service': port_info.get('name', ''),
                        'version': f"{port_info.get('product', '')} {port_info.get('version', '')}".strip(),
                    })

        hosts.append({
            'macAddress': mac,
            'ipAddress': host_ip,
            'hostname': hostname,
            'ports': ports,
        })

    logger.info(f"Scan found {len(hosts)} hosts")
    return hosts
```

- [ ] **Step 2: Create mock_scanner.py**

```python
"""Mock scanner for development on non-Linux platforms."""
import random
import logging
import time

logger = logging.getLogger(__name__)

MOCK_DEVICES = [
    {'macAddress': 'AA:BB:CC:DD:EE:01', 'hostname': 'camera-front', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'nginx 1.24'},
        {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:02', 'hostname': 'sonoff-light-01', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'Tasmota'},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:03', 'hostname': 'nvr-main', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': ''},
        {'port': 8080, 'protocol': 'tcp', 'service': 'http-proxy', 'version': ''},
        {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:04', 'hostname': '', 'ports': [
        {'port': 22, 'protocol': 'tcp', 'service': 'ssh', 'version': 'OpenSSH 9.0'},
    ]},
]


def scan_network(cidr: str, scan_type: str = 'discovery') -> list[dict]:
    """Return mock scan results simulating a real network."""
    logger.info(f"[MOCK] Scanning {cidr} (type: {scan_type})")
    time.sleep(2)  # Simulate scan time

    # Parse base IP from CIDR
    base_ip = cidr.split('/')[0].rsplit('.', 1)[0]

    hosts = []
    for i, device in enumerate(MOCK_DEVICES):
        # Randomly skip some devices to simulate offline
        if random.random() < 0.2:
            continue

        hosts.append({
            'macAddress': device['macAddress'],
            'ipAddress': f"{base_ip}.{100 + i}",
            'hostname': device['hostname'],
            'ports': device['ports'] if scan_type != 'status_check' else [],
        })

    logger.info(f"[MOCK] Found {len(hosts)} hosts")
    return hosts
```

- [ ] **Step 3: Create test_scanner.py**

```python
"""Tests for nmap result parsing."""
import pytest
from unittest.mock import MagicMock
from src.scanner import parse_nmap_results
from src.mock_scanner import scan_network as mock_scan


class TestParseNmapResults:
    def test_empty_scan(self):
        nm = MagicMock()
        nm.all_hosts.return_value = []
        result = parse_nmap_results(nm)
        assert result == []

    def test_host_with_ports(self):
        nm = MagicMock()
        nm.all_hosts.return_value = ['192.168.1.100']
        nm.__getitem__ = MagicMock(return_value={
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
            'tcp': {
                80: {'state': 'open', 'name': 'http', 'product': 'nginx', 'version': '1.24'},
                554: {'state': 'open', 'name': 'rtsp', 'product': '', 'version': ''},
            },
        })
        nm.__getitem__.return_value.all_protocols = MagicMock(return_value=['tcp'])
        nm.__getitem__.return_value.__getitem__ = lambda self, key: {
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
            'tcp': {
                80: {'state': 'open', 'name': 'http', 'product': 'nginx', 'version': '1.24'},
                554: {'state': 'open', 'name': 'rtsp', 'product': '', 'version': ''},
            },
        }.get(key, {})
        nm.__getitem__.return_value.get = lambda key, default=None: {
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
        }.get(key, default)

        result = parse_nmap_results(nm)
        assert len(result) == 1
        assert result[0]['macAddress'] == 'AA:BB:CC:DD:EE:FF'
        assert result[0]['hostname'] == 'camera-01'


class TestMockScanner:
    def test_returns_hosts(self):
        result = mock_scan('192.168.1.0/24', 'discovery')
        assert isinstance(result, list)
        assert len(result) > 0

    def test_hosts_have_required_fields(self):
        result = mock_scan('192.168.1.0/24', 'discovery')
        for host in result:
            assert 'macAddress' in host
            assert 'ipAddress' in host
            assert 'hostname' in host
            assert 'ports' in host

    def test_status_check_has_no_ports(self):
        result = mock_scan('192.168.1.0/24', 'status_check')
        for host in result:
            assert host['ports'] == []
```

- [ ] **Step 4: Run Python tests**

```bash
cd worker && pip install -r requirements.txt && python -m pytest tests/ -v
```

- [ ] **Step 5: Commit**

```bash
git add worker/
git commit -m "feat(worker): add nmap scanner, mock mode, and tests"
```

---

### Task 8: Python Worker — Bull Queue Consumer (main.py)

**Files:**
- Create: `worker/src/main.py`

- [ ] **Step 1: Create main.py**

```python
"""
IoT Sentinel Scanner Worker
Consumes scan jobs from Redis/Bull queue and executes nmap scans.
"""
import json
import time
import logging
import redis
from src.config import REDIS_URL, MOCK_MODE, QUEUE_NAME

if MOCK_MODE:
    from src.mock_scanner import scan_network
else:
    from src.scanner import scan_network

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger('worker')


def get_redis_connection() -> redis.Redis:
    """Create Redis connection from URL."""
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


def process_job(r: redis.Redis, job_data: dict) -> None:
    """Process a single scan job."""
    job_id = job_data.get('jobId', 'unknown')
    cidr = job_data.get('cidr', '')
    scan_type = job_data.get('type', 'discovery')

    logger.info(f"Processing job {job_id}: {scan_type} on {cidr}")

    try:
        hosts = scan_network(cidr, scan_type)
        result = {'hosts': hosts}
        logger.info(f"Job {job_id} completed: {len(hosts)} hosts found")
        return result
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        raise


def consume_jobs(r: redis.Redis) -> None:
    """
    Consume jobs from Bull queue using BRPOPLPUSH pattern.
    Bull stores jobs as JSON in Redis lists.
    """
    wait_queue = f"{QUEUE_NAME}:wait"
    active_queue = f"{QUEUE_NAME}:active"

    logger.info(f"Listening for jobs on {wait_queue}")

    while True:
        try:
            # Block-pop from wait queue, push to active
            job_redis_id = r.brpoplpush(wait_queue, active_queue, timeout=5)
            if job_redis_id is None:
                continue

            # Get the job data
            job_key = f"{QUEUE_NAME}:{job_redis_id}"
            job_raw = r.hget(job_key, 'data')

            if not job_raw:
                logger.warning(f"Job {job_redis_id} has no data, skipping")
                r.lrem(active_queue, 1, job_redis_id)
                continue

            job_data = json.loads(job_raw)
            result = process_job(r, job_data)

            # Store result and mark as completed
            r.hset(job_key, 'returnvalue', json.dumps(result))
            r.hset(job_key, 'finishedOn', str(int(time.time() * 1000)))
            r.lrem(active_queue, 1, job_redis_id)

            # Move to completed set
            completed_key = f"{QUEUE_NAME}:completed"
            r.zadd(completed_key, {job_redis_id: time.time()})

            # Publish completion event for NestJS Bull listener
            r.publish(f"{QUEUE_NAME}:completed", json.dumps({
                'jobId': job_redis_id,
                'returnvalue': result,
            }))

        except redis.ConnectionError:
            logger.error("Redis connection lost, retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(1)


def main():
    mode = "MOCK" if MOCK_MODE else "LIVE"
    logger.info(f"IoT Sentinel Scanner Worker starting ({mode} mode)")

    r = get_redis_connection()
    r.ping()
    logger.info("Connected to Redis")

    consume_jobs(r)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/main.py
git commit -m "feat(worker): add Bull queue consumer with Redis job processing"
```

---

### Task 9: Docker Compose — Add Worker Service

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.dev.yml`

- [ ] **Step 1: Add worker service to docker-compose.yml**

Add the worker service after the api service:

```yaml
  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile
    container_name: iot-sentinel-worker
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
    environment:
      REDIS_URL: ${REDIS_URL}
      SCANNER_MOCK_MODE: ${SCANNER_MOCK_MODE:-false}
    depends_on:
      - redis
```

- [ ] **Step 2: Add worker dev overrides to docker-compose.dev.yml**

```yaml
  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile.dev
    volumes:
      - ./worker/src:/app/src
    environment:
      SCANNER_MOCK_MODE: "true"
```

- [ ] **Step 3: Add SCANNER_MOCK_MODE to .env.example**

Add this line:
```
SCANNER_MOCK_MODE=false
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml .env.example
git commit -m "feat(docker): add worker service with network_mode host and mock mode support"
```

---

### Task 10: Integration Verification

- [ ] **Step 1: Run all NestJS tests**

```bash
cd api && npx jest --verbose
```
Expected: All unit tests pass (32+ from Phase 2 + scanner tests)

- [ ] **Step 2: Run NestJS build**

```bash
cd api && npx nest build
```
Expected: Clean compilation

- [ ] **Step 3: Run Python tests**

```bash
cd worker && python -m pytest tests/ -v
```
Expected: All pytest tests pass

- [ ] **Step 4: Verify Docker build (if Docker available)**

```bash
docker compose build api worker
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "chore: verify Phase 3 scanner integration"
```

---

## Phase Summary

After completing this plan, you will have:
- **ScanJob** schema with status tracking, rate limiting, and result history
- **Scanner module** with `POST /api/v1/scanner/discover`, `GET /api/v1/scanner/jobs`, `GET /api/v1/scanner/jobs/:id`
- **Rate limiting**: max concurrent scans per network, cooldown, global queue depth limit
- **Bull processor** that listens for job completion and processes results (MAC matching, Thing creation/update)
- **Monitor module** with `GET /api/v1/monitor/status`, `POST /api/v1/monitor/check/:thingId`
- **Python worker** with nmap scanner, mock mode for development, Bull queue consumer
- **Docker Compose** updated with worker service (network_mode: host, NET_ADMIN)
- Unit tests for scanner service (rate limiting), Python tests for nmap parsing

## Next Phase

**Phase 4: Frontend Foundation** — Next.js setup, dark theme, layout, auth pages, setup wizard.
