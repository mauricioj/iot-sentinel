# Phase 2: Core API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four core CRUD modules (Locals, Networks, Things, Groups) plus a Dashboard stats endpoint, with full test coverage and credential encryption for Things.

**Architecture:** Each module follows the established Controller → Service → Repository pattern from Phase 1. Locals and Networks have a parent-child relationship (Networks nested under Locals). Things reference Networks and Groups. Groups are transversal. The CryptoService (from Phase 1) encrypts Thing credentials. All endpoints are JWT-protected with role-based access.

**Tech Stack:** NestJS 10, TypeScript, Mongoose 8, Jest, existing Phase 1 infrastructure (auth, crypto, common modules)

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

**Existing patterns to follow:** See `api/src/users/` for the exact Controller/Service/Repository/Schema/DTO pattern. Use `HydratedDocument<T>` for schema types. Use `PaginatedResponseDto.create()` for list endpoints. Use `JwtAuthGuard` + `RolesGuard` + `@Roles()` for auth.

---

## File Structure

```
api/src/
├── locals/
│   ├── locals.module.ts
│   ├── locals.controller.ts
│   ├── locals.service.ts
│   ├── locals.service.spec.ts
│   ├── locals.repository.ts
│   ├── dto/
│   │   ├── create-local.dto.ts
│   │   └── update-local.dto.ts
│   └── schemas/
│       └── local.schema.ts
├── networks/
│   ├── networks.module.ts
│   ├── networks.controller.ts
│   ├── networks.service.ts
│   ├── networks.service.spec.ts
│   ├── networks.repository.ts
│   ├── dto/
│   │   ├── create-network.dto.ts
│   │   └── update-network.dto.ts
│   └── schemas/
│       └── network.schema.ts
├── groups/
│   ├── groups.module.ts
│   ├── groups.controller.ts
│   ├── groups.service.ts
│   ├── groups.service.spec.ts
│   ├── groups.repository.ts
│   ├── dto/
│   │   ├── create-group.dto.ts
│   │   └── update-group.dto.ts
│   └── schemas/
│       └── group.schema.ts
├── things/
│   ├── things.module.ts
│   ├── things.controller.ts
│   ├── things.service.ts
│   ├── things.service.spec.ts
│   ├── things.repository.ts
│   ├── dto/
│   │   ├── create-thing.dto.ts
│   │   ├── update-thing.dto.ts
│   │   └── thing-query.dto.ts
│   └── schemas/
│       └── thing.schema.ts
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
└── app.module.ts (modify: add new modules)
```

---

### Task 1: Locals Module — Schema, DTOs, Repository

**Files:**
- Create: `api/src/locals/schemas/local.schema.ts`
- Create: `api/src/locals/dto/create-local.dto.ts`
- Create: `api/src/locals/dto/update-local.dto.ts`
- Create: `api/src/locals/locals.repository.ts`

- [ ] **Step 1: Create local.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocalDocument = HydratedDocument<Local>;

@Schema({ timestamps: true })
export class Local {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  address: string;

  createdAt: Date;
  updatedAt: Date;
}

export const LocalSchema = SchemaFactory.createForClass(Local);
```

- [ ] **Step 2: Create create-local.dto.ts**

```typescript
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocalDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Minha casa principal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Rua Exemplo, 123' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}
```

- [ ] **Step 3: Create update-local.dto.ts**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateLocalDto } from './create-local.dto';

export class UpdateLocalDto extends PartialType(CreateLocalDto) {}
```

- [ ] **Step 4: Create locals.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Local, LocalDocument } from './schemas/local.schema';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';

@Injectable()
export class LocalsRepository {
  constructor(@InjectModel(Local.name) private readonly localModel: Model<LocalDocument>) {}

  async create(dto: CreateLocalDto): Promise<LocalDocument> {
    return this.localModel.create(dto);
  }

  async findAll(page: number, limit: number): Promise<{ data: LocalDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.localModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.localModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<LocalDocument | null> {
    return this.localModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateLocalDto): Promise<LocalDocument | null> {
    return this.localModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<LocalDocument | null> {
    return this.localModel.findByIdAndDelete(id).exec();
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/locals/
git commit -m "feat(locals): add schema, DTOs, and repository"
```

---

### Task 2: Locals Module — Service, Controller, Module (TDD)

**Files:**
- Create: `api/src/locals/locals.service.spec.ts`
- Create: `api/src/locals/locals.service.ts`
- Create: `api/src/locals/locals.controller.ts`
- Create: `api/src/locals/locals.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Write failing test for locals service**

```typescript
// api/src/locals/locals.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LocalsService } from './locals.service';
import { LocalsRepository } from './locals.repository';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('LocalsService', () => {
  let service: LocalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalsService,
        { provide: LocalsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<LocalsService>(LocalsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a local', async () => {
      const dto = { name: 'Casa', description: 'Home', address: 'Rua A' };
      mockRepository.create.mockResolvedValue({ _id: '1', ...dto });

      const result = await service.create(dto);
      expect(result.name).toBe('Casa');
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated locals', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [{ _id: '1', name: 'Casa' }],
        total: 1,
      });

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.update.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && npx jest src/locals/locals.service.spec.ts --verbose
```
Expected: FAIL — LocalsService not found

- [ ] **Step 3: Implement locals.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { LocalsRepository } from './locals.repository';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';
import { Local } from './schemas/local.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class LocalsService {
  constructor(private readonly localsRepository: LocalsRepository) {}

  async create(dto: CreateLocalDto): Promise<Local> {
    return this.localsRepository.create(dto);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Local>> {
    const { data, total } = await this.localsRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Local> {
    const local = await this.localsRepository.findById(id);
    if (!local) {
      throw new NotFoundException('Local not found');
    }
    return local;
  }

  async update(id: string, dto: UpdateLocalDto): Promise<Local> {
    const local = await this.localsRepository.update(id, dto);
    if (!local) {
      throw new NotFoundException('Local not found');
    }
    return local;
  }

  async delete(id: string): Promise<void> {
    const local = await this.localsRepository.delete(id);
    if (!local) {
      throw new NotFoundException('Local not found');
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && npx jest src/locals/locals.service.spec.ts --verbose
```
Expected: 5 tests PASS

- [ ] **Step 5: Create locals.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocalsService } from './locals.service';
import { CreateLocalDto } from './dto/create-local.dto';
import { UpdateLocalDto } from './dto/update-local.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Locals')
@ApiBearerAuth()
@Controller('api/v1/locals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocalsController {
  constructor(private readonly localsService: LocalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new local' })
  create(@Body() dto: CreateLocalDto) {
    return this.localsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all locals' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.localsService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get local by ID' })
  findOne(@Param('id') id: string) {
    return this.localsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a local' })
  update(@Param('id') id: string, @Body() dto: UpdateLocalDto) {
    return this.localsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a local' })
  remove(@Param('id') id: string) {
    return this.localsService.delete(id);
  }
}
```

- [ ] **Step 6: Create locals.module.ts**

```typescript
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
  exports: [LocalsService],
})
export class LocalsModule {}
```

- [ ] **Step 7: Add LocalsModule to app.module.ts**

```typescript
import { LocalsModule } from './locals/locals.module';
// Add to imports array
```

- [ ] **Step 8: Run `npx nest build` to verify compilation**

- [ ] **Step 9: Commit**

```bash
git add api/src/locals/ api/src/app.module.ts
git commit -m "feat(locals): add service, controller, and module with CRUD endpoints"
```

---

### Task 3: Networks Module — Schema, DTOs, Repository

**Files:**
- Create: `api/src/networks/schemas/network.schema.ts`
- Create: `api/src/networks/dto/create-network.dto.ts`
- Create: `api/src/networks/dto/update-network.dto.ts`
- Create: `api/src/networks/networks.repository.ts`

- [ ] **Step 1: Create network.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NetworkDocument = HydratedDocument<Network>;

@Schema({ timestamps: true })
export class Network {
  @Prop({ type: Types.ObjectId, ref: 'Local', required: true, index: true })
  localId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, default: null })
  vlanId: number | null;

  @Prop({ required: true })
  cidr: string;

  @Prop({ default: '' })
  gateway: string;

  @Prop({ default: '' })
  description: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NetworkSchema = SchemaFactory.createForClass(Network);
```

- [ ] **Step 2: Create create-network.dto.ts**

```typescript
import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Matches, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNetworkDto {
  @ApiProperty({ example: 'VLAN 10 - IoT' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4094)
  vlanId?: number;

  @ApiProperty({ example: '192.168.10.0/24' })
  @IsString()
  @Matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, {
    message: 'cidr must be a valid CIDR notation (e.g., 192.168.1.0/24)',
  })
  cidr: string;

  @ApiPropertyOptional({ example: '192.168.10.1' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

- [ ] **Step 3: Create update-network.dto.ts**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateNetworkDto } from './create-network.dto';

export class UpdateNetworkDto extends PartialType(CreateNetworkDto) {}
```

- [ ] **Step 4: Create networks.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Network, NetworkDocument } from './schemas/network.schema';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';

@Injectable()
export class NetworksRepository {
  constructor(@InjectModel(Network.name) private readonly networkModel: Model<NetworkDocument>) {}

  async create(localId: string, dto: CreateNetworkDto): Promise<NetworkDocument> {
    return this.networkModel.create({ ...dto, localId: new Types.ObjectId(localId) });
  }

  async findByLocalId(localId: string, page: number, limit: number): Promise<{ data: NetworkDocument[]; total: number }> {
    const filter = { localId: new Types.ObjectId(localId) };
    const [data, total] = await Promise.all([
      this.networkModel.find(filter).skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.networkModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findAll(page: number, limit: number): Promise<{ data: NetworkDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.networkModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.networkModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<NetworkDocument | null> {
    return this.networkModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateNetworkDto): Promise<NetworkDocument | null> {
    return this.networkModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<NetworkDocument | null> {
    return this.networkModel.findByIdAndDelete(id).exec();
  }

  async countByLocalId(localId: string): Promise<number> {
    return this.networkModel.countDocuments({ localId: new Types.ObjectId(localId) }).exec();
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/networks/
git commit -m "feat(networks): add schema, DTOs, and repository"
```

---

### Task 4: Networks Module — Service, Controller, Module (TDD)

**Files:**
- Create: `api/src/networks/networks.service.spec.ts`
- Create: `api/src/networks/networks.service.ts`
- Create: `api/src/networks/networks.controller.ts`
- Create: `api/src/networks/networks.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Write failing test for networks service**

```typescript
// api/src/networks/networks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NetworksService } from './networks.service';
import { NetworksRepository } from './networks.repository';
import { LocalsService } from '../locals/locals.service';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findByLocalId: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countByLocalId: jest.fn(),
};

const mockLocalsService = {
  findById: jest.fn(),
};

describe('NetworksService', () => {
  let service: NetworksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworksService,
        { provide: NetworksRepository, useValue: mockRepository },
        { provide: LocalsService, useValue: mockLocalsService },
      ],
    }).compile();

    service = module.get<NetworksService>(NetworksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should verify local exists and create network', async () => {
      mockLocalsService.findById.mockResolvedValue({ _id: 'local1', name: 'Casa' });
      mockRepository.create.mockResolvedValue({ _id: 'net1', name: 'VLAN 10', localId: 'local1' });

      const result = await service.create('local1', { name: 'VLAN 10', cidr: '192.168.10.0/24' });
      expect(result.name).toBe('VLAN 10');
      expect(mockLocalsService.findById).toHaveBeenCalledWith('local1');
    });

    it('should throw NotFoundException if local does not exist', async () => {
      mockLocalsService.findById.mockRejectedValue(new NotFoundException('Local not found'));

      await expect(
        service.create('nonexistent', { name: 'VLAN', cidr: '10.0.0.0/8' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByLocalId', () => {
    it('should verify local exists and return paginated networks', async () => {
      mockLocalsService.findById.mockResolvedValue({ _id: 'local1' });
      mockRepository.findByLocalId.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findByLocalId('local1', 1, 20);
      expect(result.meta.total).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && npx jest src/networks/networks.service.spec.ts --verbose
```
Expected: FAIL

- [ ] **Step 3: Implement networks.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { NetworksRepository } from './networks.repository';
import { LocalsService } from '../locals/locals.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { Network } from './schemas/network.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class NetworksService {
  constructor(
    private readonly networksRepository: NetworksRepository,
    private readonly localsService: LocalsService,
  ) {}

  async create(localId: string, dto: CreateNetworkDto): Promise<Network> {
    await this.localsService.findById(localId); // throws NotFoundException if not found
    return this.networksRepository.create(localId, dto);
  }

  async findByLocalId(localId: string, page: number, limit: number): Promise<PaginatedResponseDto<Network>> {
    await this.localsService.findById(localId);
    const { data, total } = await this.networksRepository.findByLocalId(localId, page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Network>> {
    const { data, total } = await this.networksRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Network> {
    const network = await this.networksRepository.findById(id);
    if (!network) {
      throw new NotFoundException('Network not found');
    }
    return network;
  }

  async update(id: string, dto: UpdateNetworkDto): Promise<Network> {
    const network = await this.networksRepository.update(id, dto);
    if (!network) {
      throw new NotFoundException('Network not found');
    }
    return network;
  }

  async delete(id: string): Promise<void> {
    const network = await this.networksRepository.delete(id);
    if (!network) {
      throw new NotFoundException('Network not found');
    }
  }

  async countByLocalId(localId: string): Promise<number> {
    return this.networksRepository.countByLocalId(localId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && npx jest src/networks/networks.service.spec.ts --verbose
```
Expected: 4 tests PASS

- [ ] **Step 5: Create networks.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NetworksService } from './networks.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Networks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Post('api/v1/locals/:localId/networks')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a network in a local' })
  create(@Param('localId') localId: string, @Body() dto: CreateNetworkDto) {
    return this.networksService.create(localId, dto);
  }

  @Get('api/v1/locals/:localId/networks')
  @ApiOperation({ summary: 'List networks in a local' })
  findByLocal(@Param('localId') localId: string, @Query() query: PaginationQueryDto) {
    return this.networksService.findByLocalId(localId, query.page, query.limit);
  }

  @Get('api/v1/networks')
  @ApiOperation({ summary: 'List all networks across all locals' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.networksService.findAll(query.page, query.limit);
  }

  @Get('api/v1/networks/:id')
  @ApiOperation({ summary: 'Get network by ID' })
  findOne(@Param('id') id: string) {
    return this.networksService.findById(id);
  }

  @Patch('api/v1/networks/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a network' })
  update(@Param('id') id: string, @Body() dto: UpdateNetworkDto) {
    return this.networksService.update(id, dto);
  }

  @Delete('api/v1/networks/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a network' })
  remove(@Param('id') id: string) {
    return this.networksService.delete(id);
  }
}
```

**Note:** The controller uses `@Controller()` with no prefix since routes span two URL prefixes (`/api/v1/locals/:localId/networks` and `/api/v1/networks`). Each route has the full path.

- [ ] **Step 6: Create networks.module.ts**

```typescript
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
```

- [ ] **Step 7: Add NetworksModule to app.module.ts**

- [ ] **Step 8: Run `npx nest build` to verify compilation**

- [ ] **Step 9: Commit**

```bash
git add api/src/networks/ api/src/app.module.ts
git commit -m "feat(networks): add service, controller, and module with CRUD endpoints"
```

---

### Task 5: Groups Module — Full (Schema + Service TDD + Controller + Module)

**Files:**
- Create: `api/src/groups/schemas/group.schema.ts`
- Create: `api/src/groups/dto/create-group.dto.ts`
- Create: `api/src/groups/dto/update-group.dto.ts`
- Create: `api/src/groups/groups.repository.ts`
- Create: `api/src/groups/groups.service.spec.ts`
- Create: `api/src/groups/groups.service.ts`
- Create: `api/src/groups/groups.controller.ts`
- Create: `api/src/groups/groups.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create group.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 'device' })
  icon: string;

  @Prop({ default: '#6366f1' })
  color: string;

  @Prop({ default: '' })
  description: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
```

- [ ] **Step 2: Create create-group.dto.ts**

```typescript
import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Cameras' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'camera' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a valid hex color (e.g., #6366f1)' })
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

- [ ] **Step 3: Create update-group.dto.ts**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateGroupDto } from './create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
```

- [ ] **Step 4: Create groups.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument } from './schemas/group.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsRepository {
  constructor(@InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>) {}

  async create(dto: CreateGroupDto): Promise<GroupDocument> {
    return this.groupModel.create(dto);
  }

  async findAll(page: number, limit: number): Promise<{ data: GroupDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.groupModel.find().skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.groupModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<GroupDocument | null> {
    return this.groupModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateGroupDto): Promise<GroupDocument | null> {
    return this.groupModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<GroupDocument | null> {
    return this.groupModel.findByIdAndDelete(id).exec();
  }
}
```

- [ ] **Step 5: Write failing test for groups service**

```typescript
// api/src/groups/groups.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GroupsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a group', async () => {
      const dto = { name: 'Cameras', icon: 'camera', color: '#22c55e' };
      mockRepository.create.mockResolvedValue({ _id: '1', ...dto });
      const result = await service.create(dto);
      expect(result.name).toBe('Cameras');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails, then implement groups.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupsRepository } from './groups.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './schemas/group.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  async create(dto: CreateGroupDto): Promise<Group> {
    return this.groupsRepository.create(dto);
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Group>> {
    const { data, total } = await this.groupsRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupsRepository.findById(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupsRepository.update(id, dto);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async delete(id: string): Promise<void> {
    const group = await this.groupsRepository.delete(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

- [ ] **Step 8: Create groups.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('api/v1/groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new group' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.groupsService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  findOne(@Param('id') id: string) {
    return this.groupsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a group' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id') id: string) {
    return this.groupsService.delete(id);
  }
}
```

- [ ] **Step 9: Create groups.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { Group, GroupSchema } from './schemas/group.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }])],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}
```

- [ ] **Step 10: Add GroupsModule to app.module.ts**

- [ ] **Step 11: Commit**

```bash
git add api/src/groups/ api/src/app.module.ts
git commit -m "feat(groups): add full CRUD module with schema, service, and controller"
```

---

### Task 6: Things Module — Schema and DTOs

**Files:**
- Create: `api/src/things/schemas/thing.schema.ts`
- Create: `api/src/things/dto/create-thing.dto.ts`
- Create: `api/src/things/dto/update-thing.dto.ts`
- Create: `api/src/things/dto/thing-query.dto.ts`

This is the most complex schema — includes embedded Port, Channel, Credentials subdocuments, enums, and indexes.

- [ ] **Step 1: Create thing.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ThingDocument = HydratedDocument<Thing>;

export enum ThingType {
  CAMERA = 'camera',
  SWITCH = 'switch',
  SENSOR = 'sensor',
  NVR = 'nvr',
  VM = 'vm',
  SERVICE = 'service',
  PLC = 'plc',
  OTHER = 'other',
}

export enum ThingStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
  DISCOVERED = 'discovered',
}

export enum ChannelDirection {
  INPUT = 'input',
  OUTPUT = 'output',
  BIDIRECTIONAL = 'bidirectional',
}

export enum ChannelType {
  LIGHT = 'light',
  MOTOR = 'motor',
  SENSOR = 'sensor',
  RELAY = 'relay',
  CAMERA = 'camera',
  PORT = 'port',
  OTHER = 'other',
}

@Schema({ _id: false })
export class Port {
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
export class Channel {
  @Prop({ required: true })
  number: number;

  @Prop({ required: true, enum: ChannelDirection })
  direction: ChannelDirection;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ChannelType, default: ChannelType.OTHER })
  type: ChannelType;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  icon: string;
}

@Schema({ _id: false })
export class Credentials {
  @Prop({ default: '' })
  username: string;

  @Prop({ default: '' })
  password: string;

  @Prop({ default: '' })
  notes: string;
}

@Schema({ timestamps: true })
export class Thing {
  @Prop({ type: Types.ObjectId, ref: 'Network', required: true, index: true })
  networkId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [], index: true })
  groupIds: Types.ObjectId[];

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ThingType, default: ThingType.OTHER })
  type: ThingType;

  @Prop({ sparse: true, trim: true })
  macAddress: string;

  @Prop({ default: '' })
  ipAddress: string;

  @Prop({ default: '' })
  hostname: string;

  @Prop({ enum: ThingStatus, default: ThingStatus.UNKNOWN, index: true })
  status: ThingStatus;

  @Prop({ type: Date })
  lastSeenAt: Date;

  @Prop({ type: [Port], default: [] })
  ports: Port[];

  @Prop({ type: [Channel], default: [] })
  channels: Channel[];

  @Prop({ type: Credentials, default: () => ({}) })
  credentials: Credentials;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const ThingSchema = SchemaFactory.createForClass(Thing);
ThingSchema.index({ macAddress: 1 }, { unique: true, sparse: true });
```

- [ ] **Step 2: Create create-thing.dto.ts**

```typescript
import {
  IsString, IsOptional, IsEnum, IsArray, IsNumber, IsObject,
  MinLength, MaxLength, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThingType, ChannelDirection, ChannelType } from '../schemas/thing.schema';

class PortDto {
  @ApiProperty() @IsNumber() @Min(1) @Max(65535) port: number;
  @ApiPropertyOptional({ default: 'tcp' }) @IsOptional() @IsString() protocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() service?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
}

class ChannelDto {
  @ApiProperty() @IsNumber() number: number;
  @ApiProperty({ enum: ChannelDirection }) @IsEnum(ChannelDirection) direction: ChannelDirection;
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiPropertyOptional({ enum: ChannelType }) @IsOptional() @IsEnum(ChannelType) type?: ChannelType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
}

class CredentialsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() username?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateThingDto {
  @ApiProperty() @IsString() networkId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  groupIds?: string[];

  @ApiProperty({ example: 'Camera Garagem' })
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ThingType })
  @IsEnum(ThingType)
  type: ThingType;

  @ApiPropertyOptional({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsOptional() @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional() @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  hostname?: string;

  @ApiPropertyOptional({ type: [PortDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PortDto)
  ports?: PortDto[];

  @ApiPropertyOptional({ type: [ChannelDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChannelDto)
  channels?: ChannelDto[];

  @ApiPropertyOptional({ type: CredentialsDto })
  @IsOptional() @ValidateNested() @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 3: Create update-thing.dto.ts**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateThingDto } from './create-thing.dto';

export class UpdateThingDto extends PartialType(CreateThingDto) {}
```

- [ ] **Step 4: Create thing-query.dto.ts**

```typescript
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ThingStatus } from '../schemas/thing.schema';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ThingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() networkId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() localId?: string;
  @ApiPropertyOptional({ enum: ThingStatus }) @IsOptional() @IsEnum(ThingStatus) status?: ThingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}
```

- [ ] **Step 5: Commit**

```bash
git add api/src/things/
git commit -m "feat(things): add schema with embedded types, DTOs, and query filters"
```

---

### Task 7: Things Module — Repository, Service (TDD), Controller, Module

**Files:**
- Create: `api/src/things/things.repository.ts`
- Create: `api/src/things/things.service.spec.ts`
- Create: `api/src/things/things.service.ts`
- Create: `api/src/things/things.controller.ts`
- Create: `api/src/things/things.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create things.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Thing, ThingDocument } from './schemas/thing.schema';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';

@Injectable()
export class ThingsRepository {
  constructor(@InjectModel(Thing.name) private readonly thingModel: Model<ThingDocument>) {}

  async create(dto: CreateThingDto): Promise<ThingDocument> {
    const data = {
      ...dto,
      networkId: new Types.ObjectId(dto.networkId),
      groupIds: dto.groupIds?.map((id) => new Types.ObjectId(id)) || [],
    };
    return this.thingModel.create(data);
  }

  async findAll(query: ThingQueryDto): Promise<{ data: ThingDocument[]; total: number }> {
    const filter: FilterQuery<Thing> = {};

    if (query.networkId) {
      filter.networkId = new Types.ObjectId(query.networkId);
    }
    if (query.groupId) {
      filter.groupIds = new Types.ObjectId(query.groupId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.q) {
      const regex = new RegExp(query.q, 'i');
      filter.$or = [
        { name: regex },
        { macAddress: regex },
        { ipAddress: regex },
        { hostname: regex },
        { 'channels.name': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.thingModel
        .find(filter)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .sort({ name: 1 })
        .exec(),
      this.thingModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ThingDocument | null> {
    return this.thingModel.findById(id).exec();
  }

  async findByMacAddress(mac: string): Promise<ThingDocument | null> {
    return this.thingModel.findOne({ macAddress: mac }).exec();
  }

  async update(id: string, dto: Partial<UpdateThingDto & Record<string, unknown>>): Promise<ThingDocument | null> {
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.networkId) {
      updateData.networkId = new Types.ObjectId(dto.networkId);
    }
    if (dto.groupIds) {
      updateData.groupIds = dto.groupIds.map((id) => new Types.ObjectId(id));
    }
    return this.thingModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<ThingDocument | null> {
    return this.thingModel.findByIdAndDelete(id).exec();
  }

  async countByNetworkId(networkId: string): Promise<number> {
    return this.thingModel.countDocuments({ networkId: new Types.ObjectId(networkId) }).exec();
  }

  async countByGroupId(groupId: string): Promise<number> {
    return this.thingModel.countDocuments({ groupIds: new Types.ObjectId(groupId) }).exec();
  }

  async countByStatus(): Promise<Record<string, number>> {
    const results = await this.thingModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r._id] = r.count;
    }
    return counts;
  }

  async countTotal(): Promise<number> {
    return this.thingModel.countDocuments().exec();
  }

  async findByGroupId(groupId: string, page: number, limit: number): Promise<{ data: ThingDocument[]; total: number }> {
    const filter = { groupIds: new Types.ObjectId(groupId) };
    const [data, total] = await Promise.all([
      this.thingModel.find(filter).skip((page - 1) * limit).limit(limit).sort({ name: 1 }).exec(),
      this.thingModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }
}
```

- [ ] **Step 2: Write failing test for things service**

```typescript
// api/src/things/things.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ThingsService } from './things.service';
import { ThingsRepository } from './things.repository';
import { NetworksService } from '../networks/networks.service';
import { CryptoService } from '../crypto/crypto.service';
import { NotFoundException } from '@nestjs/common';
import { ThingType } from './schemas/thing.schema';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByMacAddress: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGroupId: jest.fn(),
};

const mockNetworksService = { findById: jest.fn() };
const mockCryptoService = {
  encrypt: jest.fn((v: string) => `encrypted:${v}`),
  decrypt: jest.fn((v: string) => v.replace('encrypted:', '')),
};

describe('ThingsService', () => {
  let service: ThingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThingsService,
        { provide: ThingsRepository, useValue: mockRepository },
        { provide: NetworksService, useValue: mockNetworksService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<ThingsService>(ThingsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should verify network exists, encrypt credentials, and create thing', async () => {
      mockNetworksService.findById.mockResolvedValue({ _id: 'net1' });
      mockRepository.create.mockResolvedValue({
        _id: '1', name: 'Camera', networkId: 'net1',
        credentials: { username: 'encrypted:admin', password: 'encrypted:pass', notes: '' },
      });

      const result = await service.create({
        networkId: 'net1',
        name: 'Camera',
        type: ThingType.CAMERA,
        credentials: { username: 'admin', password: 'pass' },
      });

      expect(mockNetworksService.findById).toHaveBeenCalledWith('net1');
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('admin');
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('pass');
      expect(result.name).toBe('Camera');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should decrypt credentials on find', async () => {
      mockRepository.findById.mockResolvedValue({
        _id: '1', name: 'Camera',
        credentials: { username: 'encrypted:admin', password: 'encrypted:pass', notes: '' },
        toObject: function() { return { ...this }; },
      });

      const result = await service.findById('1');
      expect(mockCryptoService.decrypt).toHaveBeenCalledWith('encrypted:admin');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then implement things.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ThingsRepository } from './things.repository';
import { NetworksService } from '../networks/networks.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';
import { Thing } from './schemas/thing.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class ThingsService {
  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly networksService: NetworksService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(dto: CreateThingDto): Promise<Thing> {
    await this.networksService.findById(dto.networkId);
    if (dto.credentials) {
      dto.credentials = this.encryptCredentials(dto.credentials);
    }
    return this.thingsRepository.create(dto);
  }

  async findAll(query: ThingQueryDto): Promise<PaginatedResponseDto<Thing>> {
    const { data, total } = await this.thingsRepository.findAll(query);
    return PaginatedResponseDto.create(data, total, query.page, query.limit);
  }

  async findById(id: string): Promise<Record<string, unknown>> {
    const thing = await this.thingsRepository.findById(id);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
    const obj = thing.toObject();
    if (obj.credentials) {
      obj.credentials = this.decryptCredentials(obj.credentials);
    }
    return obj;
  }

  async update(id: string, dto: UpdateThingDto): Promise<Thing> {
    if (dto.credentials) {
      dto.credentials = this.encryptCredentials(dto.credentials);
    }
    const thing = await this.thingsRepository.update(id, dto);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
    return thing;
  }

  async delete(id: string): Promise<void> {
    const thing = await this.thingsRepository.delete(id);
    if (!thing) {
      throw new NotFoundException('Thing not found');
    }
  }

  async findByGroupId(groupId: string, page: number, limit: number): Promise<PaginatedResponseDto<Thing>> {
    const { data, total } = await this.thingsRepository.findByGroupId(groupId, page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  private encryptCredentials(creds: { username?: string; password?: string; notes?: string }) {
    return {
      username: creds.username ? this.cryptoService.encrypt(creds.username) : '',
      password: creds.password ? this.cryptoService.encrypt(creds.password) : '',
      notes: creds.notes ? this.cryptoService.encrypt(creds.notes) : '',
    };
  }

  private decryptCredentials(creds: { username?: string; password?: string; notes?: string }) {
    return {
      username: creds.username ? this.cryptoService.decrypt(creds.username) : '',
      password: creds.password ? this.cryptoService.decrypt(creds.password) : '',
      notes: creds.notes ? this.cryptoService.decrypt(creds.notes) : '',
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && npx jest src/things/things.service.spec.ts --verbose
```

- [ ] **Step 5: Create things.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThingsService } from './things.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { ThingQueryDto } from './dto/thing-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Things')
@ApiBearerAuth()
@Controller('api/v1/things')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThingsController {
  constructor(private readonly thingsService: ThingsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new thing' })
  create(@Body() dto: CreateThingDto) {
    return this.thingsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List things with filters' })
  findAll(@Query() query: ThingQueryDto) {
    return this.thingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get thing by ID (credentials decrypted)' })
  findOne(@Param('id') id: string) {
    return this.thingsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a thing' })
  update(@Param('id') id: string, @Body() dto: UpdateThingDto) {
    return this.thingsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a thing' })
  remove(@Param('id') id: string) {
    return this.thingsService.delete(id);
  }
}
```

- [ ] **Step 6: Create things.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThingsController } from './things.controller';
import { ThingsService } from './things.service';
import { ThingsRepository } from './things.repository';
import { Thing, ThingSchema } from './schemas/thing.schema';
import { NetworksModule } from '../networks/networks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Thing.name, schema: ThingSchema }]),
    NetworksModule,
  ],
  controllers: [ThingsController],
  providers: [ThingsService, ThingsRepository],
  exports: [ThingsService, ThingsRepository],
})
export class ThingsModule {}
```

- [ ] **Step 7: Add ThingsModule to app.module.ts**

- [ ] **Step 8: Add `GET /api/v1/groups/:id/things` to groups controller**

Add this method to `api/src/groups/groups.controller.ts`:

```typescript
// Import ThingsService and add to constructor
import { ThingsService } from '../things/things.service';

// Add ThingsModule to GroupsModule imports

// Add endpoint:
@Get(':id/things')
@ApiOperation({ summary: 'List things in a group' })
findThings(@Param('id') id: string, @Query() query: PaginationQueryDto) {
  return this.thingsService.findByGroupId(id, query.page, query.limit);
}
```

Update `groups.module.ts` to import `ThingsModule` and inject `ThingsService` into the controller.

- [ ] **Step 9: Run all tests and build**

```bash
cd api && npx jest --verbose && npx nest build
```

- [ ] **Step 10: Commit**

```bash
git add api/src/things/ api/src/groups/ api/src/app.module.ts
git commit -m "feat(things): add full CRUD module with credential encryption and group integration"
```

---

### Task 8: Dashboard Module

**Files:**
- Create: `api/src/dashboard/dashboard.service.ts`
- Create: `api/src/dashboard/dashboard.controller.ts`
- Create: `api/src/dashboard/dashboard.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create dashboard.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { ThingsRepository } from '../things/things.repository';
import { LocalsRepository } from '../locals/locals.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly thingsRepository: ThingsRepository,
    private readonly localsRepository: LocalsRepository,
  ) {}

  async getStats() {
    const [totalThings, statusCounts, { total: totalLocals }] = await Promise.all([
      this.thingsRepository.countTotal(),
      this.thingsRepository.countByStatus(),
      this.localsRepository.findAll(1, 1),
    ]);

    return {
      things: {
        total: totalThings,
        online: statusCounts['online'] || 0,
        offline: statusCounts['offline'] || 0,
        unknown: statusCounts['unknown'] || 0,
        discovered: statusCounts['discovered'] || 0,
      },
      locals: {
        total: totalLocals,
      },
    };
  }
}
```

- [ ] **Step 2: Create dashboard.controller.ts**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }
}
```

- [ ] **Step 3: Create dashboard.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ThingsModule } from '../things/things.module';
import { LocalsModule } from '../locals/locals.module';

@Module({
  imports: [ThingsModule, LocalsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 4: Add DashboardModule to app.module.ts**

- [ ] **Step 5: Run all tests and build**

```bash
cd api && npx jest --verbose && npx nest build
```

- [ ] **Step 6: Commit**

```bash
git add api/src/dashboard/ api/src/app.module.ts
git commit -m "feat(dashboard): add stats endpoint with thing counts and status summary"
```

---

### Task 9: Phase 2 E2E Tests

**Files:**
- Modify: `api/test/app.e2e-spec.ts`

- [ ] **Step 1: Add E2E tests for the new modules**

Append these test suites to the existing `api/test/app.e2e-spec.ts` file, inside the main `describe('App (e2e)')` block, after the Auth tests. The tests should use the `accessToken` obtained from the Auth login test.

Test flow:
1. Create a Local → verify 201
2. List Locals → verify pagination
3. Create a Network in the Local → verify 201
4. List Networks by Local → verify data
5. List all Networks (global) → verify data
6. Create a Group → verify 201
7. Create a Thing (with credentials) → verify 201
8. Get Thing by ID → verify credentials are decrypted
9. List Things with filters → verify query params work
10. Get Dashboard stats → verify counts
11. Delete Thing → verify 200
12. Delete Network → verify 200
13. Delete Local → verify 200

- [ ] **Step 2: Run E2E tests**

```bash
cd api && npx jest --config test/jest-e2e.config.ts --verbose --forceExit
```

- [ ] **Step 3: Commit**

```bash
git add api/test/
git commit -m "test: add E2E tests for locals, networks, groups, things, and dashboard"
```

---

## Phase Summary

After completing this plan, you will have:
- **Locals** CRUD at `/api/v1/locals`
- **Networks** CRUD at `/api/v1/locals/:id/networks` + global list at `/api/v1/networks`
- **Groups** CRUD at `/api/v1/groups` with `/api/v1/groups/:id/things`
- **Things** CRUD at `/api/v1/things` with text search, filters (network, group, status, local), credential encryption/decryption, embedded Ports/Channels
- **Dashboard** stats at `/api/v1/dashboard/stats`
- Unit tests for all services (Locals, Networks, Groups, Things)
- E2E tests covering the full CRUD flow
- All endpoints JWT-protected with role-based access

## Next Phase

**Phase 3: Scanner** — Python worker, Bull queue integration, scanner/monitor modules.
