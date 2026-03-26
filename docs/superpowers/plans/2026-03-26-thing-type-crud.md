# ThingType CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded ThingType enum with a CRUD entity that has configurable capabilities (enableChannels, enablePortScan, enableCredentials), seeded with 18 default types, and wire it through the entire stack.

**Architecture:** New `thing-types` NestJS module with standard Controller → Service → Repository layers. The Thing schema drops the enum and stores a plain string slug. Frontend caches ThingTypes in a React context and uses capabilities to conditionally render sections.

**Tech Stack:** NestJS/Mongoose (backend), Next.js/React context (frontend), existing icon-picker and color patterns from Groups module.

---

### Task 1: Backend — ThingType Schema and Repository

**Files:**
- Create: `api/src/thing-types/schemas/thing-type.schema.ts`
- Create: `api/src/thing-types/thing-types.repository.ts`

- [ ] **Step 1: Create ThingType schema**

```typescript
// api/src/thing-types/schemas/thing-type.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ThingTypeDocument = HydratedDocument<ThingType>;

@Schema({ _id: false })
export class ThingTypeCapabilities {
  @Prop({ default: false })
  enableChannels: boolean;

  @Prop({ default: false })
  enablePortScan: boolean;

  @Prop({ default: false })
  enableCredentials: boolean;
}

@Schema({ timestamps: true })
export class ThingType {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ default: 'help-circle' })
  icon: string;

  @Prop({ default: '#94a3b8' })
  color: string;

  @Prop({ type: ThingTypeCapabilities, default: () => ({}) })
  capabilities: ThingTypeCapabilities;

  @Prop({ default: false })
  isSystem: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ThingTypeSchema = SchemaFactory.createForClass(ThingType);
```

- [ ] **Step 2: Create ThingTypes repository**

```typescript
// api/src/thing-types/thing-types.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ThingType, ThingTypeDocument } from './schemas/thing-type.schema';

@Injectable()
export class ThingTypesRepository {
  constructor(@InjectModel(ThingType.name) private readonly model: Model<ThingTypeDocument>) {}

  async create(data: Partial<ThingType>): Promise<ThingTypeDocument> {
    return this.model.create(data);
  }

  async findAll(): Promise<ThingTypeDocument[]> {
    return this.model.find().sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<ThingTypeDocument | null> {
    return this.model.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<ThingTypeDocument | null> {
    return this.model.findOne({ slug }).exec();
  }

  async update(id: string, data: Partial<ThingType>): Promise<ThingTypeDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<ThingTypeDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async insertMany(data: Partial<ThingType>[]): Promise<void> {
    await this.model.insertMany(data);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/thing-types/
git commit -m "feat(thing-types): add schema and repository"
```

---

### Task 2: Backend — DTOs and Service with Seed

**Files:**
- Create: `api/src/thing-types/dto/create-thing-type.dto.ts`
- Create: `api/src/thing-types/dto/update-thing-type.dto.ts`
- Create: `api/src/thing-types/thing-types.service.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// api/src/thing-types/dto/create-thing-type.dto.ts
import { IsString, IsOptional, IsBoolean, ValidateNested, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CapabilitiesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableChannels?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enablePortScan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableCredentials?: boolean;
}

export class CreateThingTypeDto {
  @ApiProperty({ example: 'Camera' })
  @IsString() @MinLength(1) @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'camera' })
  @IsString() @MinLength(1) @MaxLength(50)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be lowercase with hyphens only' })
  slug: string;

  @ApiPropertyOptional({ example: 'camera' })
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional() @IsString()
  color?: string;

  @ApiPropertyOptional({ type: CapabilitiesDto })
  @IsOptional() @ValidateNested() @Type(() => CapabilitiesDto)
  capabilities?: CapabilitiesDto;
}
```

```typescript
// api/src/thing-types/dto/update-thing-type.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateThingTypeDto } from './create-thing-type.dto';

export class UpdateThingTypeDto extends PartialType(CreateThingTypeDto) {}
```

- [ ] **Step 2: Create service with seed logic**

```typescript
// api/src/thing-types/thing-types.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { ThingTypesRepository } from './thing-types.repository';
import { CreateThingTypeDto } from './dto/create-thing-type.dto';
import { UpdateThingTypeDto } from './dto/update-thing-type.dto';

const SEED_TYPES = [
  { name: 'Router',       slug: 'router',       icon: 'router',       color: '#6366f1', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Switch',       slug: 'switch',       icon: 'git-branch',   color: '#8b5cf6', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Access Point', slug: 'access-point',  icon: 'wifi',         color: '#06b6d4', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Firewall',     slug: 'firewall',     icon: 'shield',       color: '#ef4444', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'Server',       slug: 'server',       icon: 'server',       color: '#3b82f6', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'Workstation',  slug: 'workstation',  icon: 'monitor',      color: '#64748b', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'VM',           slug: 'vm',           icon: 'box',          color: '#a855f7', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'NAS',          slug: 'nas',          icon: 'database',     color: '#0ea5e9', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'NVR',          slug: 'nvr',          icon: 'hard-drive',   color: '#7c3aed', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Camera',       slug: 'camera',       icon: 'camera',       color: '#f59e0b', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Printer',      slug: 'printer',      icon: 'printer',      color: '#78716c', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false } },
  { name: 'Smart TV',     slug: 'smart-tv',     icon: 'tv',           color: '#ec4899', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false } },
  { name: 'Sensor',       slug: 'sensor',       icon: 'thermometer',  color: '#10b981', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false } },
  { name: 'PLC',          slug: 'plc',          icon: 'cpu',          color: '#f97316', capabilities: { enableChannels: true,  enablePortScan: false, enableCredentials: true } },
  { name: 'HMI',          slug: 'hmi',          icon: 'tablet',       color: '#d946ef', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Gateway',      slug: 'gateway',      icon: 'network',      color: '#14b8a6', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: true } },
  { name: 'Service',      slug: 'service',      icon: 'cloud',        color: '#6366f1', capabilities: { enableChannels: false, enablePortScan: true,  enableCredentials: true } },
  { name: 'Other',        slug: 'other',        icon: 'help-circle',  color: '#94a3b8', capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false } },
];

@Injectable()
export class ThingTypesService implements OnModuleInit {
  private readonly logger = new Logger(ThingTypesService.name);

  constructor(private readonly repository: ThingTypesRepository) {}

  async onModuleInit() {
    const count = await this.repository.count();
    if (count === 0) {
      this.logger.log('Seeding default thing types...');
      await this.repository.insertMany(SEED_TYPES.map((t) => ({ ...t, isSystem: true })));
      this.logger.log(`Seeded ${SEED_TYPES.length} thing types`);
    }
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findById(id: string) {
    const type = await this.repository.findById(id);
    if (!type) throw new NotFoundException('Thing type not found');
    return type;
  }

  async findBySlug(slug: string) {
    return this.repository.findBySlug(slug);
  }

  async create(dto: CreateThingTypeDto) {
    const existing = await this.repository.findBySlug(dto.slug);
    if (existing) throw new ConflictException(`Slug "${dto.slug}" already exists`);
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateThingTypeDto) {
    if (dto.slug) {
      const existing = await this.repository.findBySlug(dto.slug);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
    }
    const updated = await this.repository.update(id, dto);
    if (!updated) throw new NotFoundException('Thing type not found');
    return updated;
  }

  async delete(id: string) {
    const type = await this.repository.findById(id);
    if (!type) throw new NotFoundException('Thing type not found');
    if (type.isSystem) throw new ForbiddenException('Cannot delete system thing types');
    return this.repository.delete(id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/thing-types/
git commit -m "feat(thing-types): add DTOs and service with seed"
```

---

### Task 3: Backend — Controller and Module

**Files:**
- Create: `api/src/thing-types/thing-types.controller.ts`
- Create: `api/src/thing-types/thing-types.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create controller**

```typescript
// api/src/thing-types/thing-types.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThingTypesService } from './thing-types.service';
import { CreateThingTypeDto } from './dto/create-thing-type.dto';
import { UpdateThingTypeDto } from './dto/update-thing-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Thing Types')
@ApiBearerAuth()
@Controller('api/v1/thing-types')
@UseGuards(JwtAuthGuard)
export class ThingTypesController {
  constructor(private readonly service: ThingTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all thing types' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get thing type by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a thing type' })
  create(@Body() dto: CreateThingTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a thing type' })
  update(@Param('id') id: string, @Body() dto: UpdateThingTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a thing type' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

- [ ] **Step 2: Create module**

```typescript
// api/src/thing-types/thing-types.module.ts
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
```

- [ ] **Step 3: Register in AppModule**

Add import of `ThingTypesModule` to `api/src/app.module.ts`:
- Add import line: `import { ThingTypesModule } from './thing-types/thing-types.module';`
- Add `ThingTypesModule` to the imports array after `GroupsModule`

- [ ] **Step 4: Run tests and commit**

```bash
cd api && npx jest --verbose
git add api/src/thing-types/ api/src/app.module.ts
git commit -m "feat(thing-types): add controller, module, register in app"
```

---

### Task 4: Backend — Remove ThingType Enum, Update Thing Schema and DTOs

**Files:**
- Modify: `api/src/things/schemas/thing.schema.ts`
- Modify: `api/src/things/dto/create-thing.dto.ts`

- [ ] **Step 1: Update Thing schema**

In `api/src/things/schemas/thing.schema.ts`:
- Remove the `ThingType` enum entirely (lines 6-15)
- Change the `type` field from `@Prop({ enum: ThingType, default: ThingType.OTHER })` to `@Prop({ default: 'other' })`
- Keep exporting `ThingStatus` and other enums unchanged

- [ ] **Step 2: Update CreateThingDto**

In `api/src/things/dto/create-thing.dto.ts`:
- Remove import of `ThingType`
- Change `@IsEnum(ThingType)` to `@IsString()`
- Change `@ApiPropertyOptional({ enum: ThingType, default: ThingType.OTHER })` to `@ApiPropertyOptional({ example: 'camera' })`

- [ ] **Step 3: Fix any remaining ThingType enum imports**

Search for `ThingType` imports across `api/src/` (excluding `thing-types/`) and remove or replace them. The scanner processor already uses `'other' as any` so the cast can be simplified to just `'other'`.

- [ ] **Step 4: Run tests and commit**

```bash
cd api && npx jest --verbose
git add api/src/things/
git commit -m "refactor(things): replace ThingType enum with plain string slug"
```

---

### Task 5: Backend — Include ThingTypes in Backup

**Files:**
- Modify: `api/src/backup/backup.service.ts`
- Modify: `api/src/backup/backup.module.ts`

- [ ] **Step 1: Update BackupModule to import ThingType model**

In `api/src/backup/backup.module.ts`, add to MongooseModule.forFeature:
```typescript
{ name: ThingType.name, schema: ThingTypeSchema }
```
Add the corresponding imports from `../thing-types/schemas/thing-type.schema`.

- [ ] **Step 2: Update BackupService**

In `api/src/backup/backup.service.ts`:
- Add `@InjectModel(ThingType.name) private readonly thingTypeModel: Model<ThingType>` to constructor
- In `export()`: add `thingTypes` to the Promise.all query and include in the backup object
- In `restore()`: add thingTypes restore block (deleteMany + insertMany) before the locals restore
- In `restoreFull()`: thingTypes are already covered by `restore()` since they're a data collection

- [ ] **Step 3: Run tests and commit**

```bash
cd api && npx jest --verbose
git add api/src/backup/
git commit -m "feat(backup): include thing types in export/restore"
```

---

### Task 6: Frontend — ThingType Service and Context

**Files:**
- Create: `frontend/src/services/thing-types.service.ts`
- Create: `frontend/src/contexts/thing-types-context.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add ThingType interface**

In `frontend/src/types/index.ts`, add after the `Group` interface:

```typescript
export interface ThingTypeCapabilities {
  enableChannels: boolean;
  enablePortScan: boolean;
  enableCredentials: boolean;
}

export interface ThingType {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  capabilities: ThingTypeCapabilities;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Note: rename the existing `Thing.type` field stays `type: string` — no change needed there.

- [ ] **Step 2: Create service**

```typescript
// frontend/src/services/thing-types.service.ts
import { api } from './api';
import { ThingType } from '@/types';

export const thingTypesService = {
  findAll: () => api<ThingType[]>('/api/v1/thing-types'),
  findById: (id: string) => api<ThingType>(`/api/v1/thing-types/${id}`),
  create: (data: Partial<ThingType>) =>
    api<ThingType>('/api/v1/thing-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ThingType>) =>
    api<ThingType>(`/api/v1/thing-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api(`/api/v1/thing-types/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 3: Create context provider**

```typescript
// frontend/src/contexts/thing-types-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { thingTypesService } from '@/services/thing-types.service';
import { ThingType } from '@/types';

interface ThingTypesContextType {
  thingTypes: ThingType[];
  loading: boolean;
  getBySlug: (slug: string) => ThingType | undefined;
  refresh: () => Promise<void>;
}

const ThingTypesContext = createContext<ThingTypesContextType | undefined>(undefined);

export function ThingTypesProvider({ children }: { children: ReactNode }) {
  const [thingTypes, setThingTypes] = useState<ThingType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await thingTypesService.findAll();
      setThingTypes(data);
    } catch {
      // Not authenticated yet (login/setup pages) — ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const getBySlug = useCallback(
    (slug: string) => thingTypes.find((t) => t.slug === slug),
    [thingTypes],
  );

  return (
    <ThingTypesContext.Provider value={{ thingTypes, loading, getBySlug, refresh: fetchTypes }}>
      {children}
    </ThingTypesContext.Provider>
  );
}

export function useThingTypes() {
  const context = useContext(ThingTypesContext);
  if (!context) throw new Error('useThingTypes must be used within ThingTypesProvider');
  return context;
}
```

- [ ] **Step 4: Wrap app with ThingTypesProvider**

In `frontend/src/app/layout.tsx`, add the provider inside AuthProvider:

```tsx
import { ThingTypesProvider } from '@/contexts/thing-types-context';

// In the return:
<AuthProvider>
  <ThingTypesProvider>{children}</ThingTypesProvider>
</AuthProvider>
```

- [ ] **Step 5: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/
git commit -m "feat(frontend): add ThingType service, context, and types"
```

---

### Task 7: Frontend — Things List with Type Icons, Simplified Modal

**Files:**
- Modify: `frontend/src/app/(dashboard)/things/page.tsx`

- [ ] **Step 1: Refactor Things list**

Key changes to `frontend/src/app/(dashboard)/things/page.tsx`:

1. Import `useThingTypes` and `getIconComponent` from icon-picker
2. Remove the hardcoded `THING_TYPES` array
3. Replace the `columns` array:
   - Name column: prepend the type icon (colored) before the name
   - Remove the "Type" text column
   - Add "Vendor" column (already present from earlier work)
4. Simplify the "New Thing" modal form:
   - Keep: name, type (select from thingTypes context), networkId, macAddress, ipAddress
   - Remove: credentials section
5. The type `<Select>` should show icon + name options from `thingTypes` context

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/\(dashboard\)/things/page.tsx
git commit -m "feat(things): type icons in list, simplified create modal"
```

---

### Task 8: Frontend — Thing Detail with Conditional Capabilities

**Files:**
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx`

- [ ] **Step 1: Refactor Thing detail page**

Key changes to `frontend/src/app/(dashboard)/things/[id]/page.tsx`:

1. Import `useThingTypes`
2. Get the ThingType via `getBySlug(thing.type)`
3. Replace hardcoded `THING_TYPES` array with thingTypes from context for the edit modal type select
4. Conditional rendering based on capabilities:
   - Channels section: only render if `thingTypeData?.capabilities.enableChannels !== false` (default show for unknown types)
   - Credentials section: only render if `thingTypeData?.capabilities.enableCredentials !== false`
   - Add "Deep Scan" button in header if `thingTypeData?.capabilities.enablePortScan === true`
5. The "Deep Scan" button calls the existing scanner API: `POST /api/v1/scanner/discover` with the thing's networkId and type `deep_scan`, targeting just that thing's IP

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/\(dashboard\)/things/\[id\]/page.tsx
git commit -m "feat(things): conditional sections based on type capabilities"
```

---

### Task 9: Frontend — ThingType Management in Settings

**Files:**
- Modify: `frontend/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Add ThingTypes section to Settings**

Add a new "Thing Types" card section between "Backup" and "Users" in the Settings page:

1. Import `useThingTypes`, `thingTypesService`, `getIconComponent`
2. Add state for: thingType modal (create/edit), form fields (name, slug, icon, color, capabilities toggles), delete confirmation
3. DataTable showing all types with columns: Icon (colored), Name, Capabilities (badges), Actions (edit/delete)
4. "Add Type" button opens modal with: name input, slug input (auto-generated from name on type), icon picker, color input, 3 capability toggles
5. Edit button opens same modal pre-filled
6. Delete button only enabled for non-system types, shows confirmation dialog
7. System types show a subtle "(system)" label, delete button disabled
8. After create/update/delete, call `refresh()` from ThingTypes context

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(settings): add ThingType management section"
```

---

### Task 10: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run API tests**

```bash
cd api && npx jest --verbose
```

Expected: All 42+ tests pass.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Integration smoke test**

```bash
docker compose up -d
```

1. Open browser → verify ThingTypes are seeded (check Settings page)
2. Create a new Thing → verify type select shows icons
3. Open Thing detail → verify conditional sections (PLC shows Channels, Server shows Deep Scan button, Sensor hides Credentials)
4. Edit a ThingType in Settings → verify changes reflect in Thing detail
5. Search things by type name → verify it works
6. Export backup → restore → verify ThingTypes are included

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: ThingType CRUD with capabilities — complete"
```
