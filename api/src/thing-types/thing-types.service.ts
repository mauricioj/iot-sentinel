import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { ThingTypesRepository } from './thing-types.repository';
import { ThingType } from './schemas/thing-type.schema';
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
    const existingCount = await this.repository.count();
    this.logger.log(`Found ${existingCount} existing thing types, checking for ${SEED_TYPES.length} seed types...`);
    let seeded = 0;
    for (const seedType of SEED_TYPES) {
      const exists = await this.repository.findBySlug(seedType.slug);
      if (!exists) {
        await this.repository.create({ ...seedType, isSystem: true } as Partial<ThingType>);
        seeded++;
      }
    }
    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} new thing types`);
    } else {
      this.logger.log('All seed types already present');
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
    return this.repository.create(dto as Partial<ThingType>);
  }

  async update(id: string, dto: UpdateThingTypeDto) {
    if (dto.slug) {
      const existing = await this.repository.findBySlug(dto.slug);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
    }
    const updated = await this.repository.update(id, dto as Partial<ThingType>);
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
