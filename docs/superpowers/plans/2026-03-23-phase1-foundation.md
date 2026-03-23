# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the IoT Sentinel monorepo with Docker, NestJS API foundation, authentication, encryption service, health checks, and settings — producing a running `docker-compose up` with login, JWT auth, and Swagger docs.

**Architecture:** Monorepo with `api/` (NestJS), `frontend/` (placeholder), `worker/` (placeholder). Docker Compose orchestrates MongoDB, Redis, and the API. The common module provides pagination, base DTOs, and error handling. Auth uses JWT with refresh tokens in MongoDB. Crypto service manages AES-256-GCM encryption for future credential storage.

**Tech Stack:** NestJS 10, TypeScript, Mongoose 8, Bull (via @nestjs/bull), Jest, Docker, MongoDB 7, Redis 7

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

---

## File Structure

```
iot-sentinel/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.dev.yml
├── api/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── .dockerignore
│   ├── jest.config.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── common.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── pagination-query.dto.ts
│   │   │   │   └── paginated-response.dto.ts
│   │   │   └── filters/
│   │   │       └── http-exception.filter.ts
│   │   ├── crypto/
│   │   │   ├── crypto.module.ts
│   │   │   ├── crypto.service.ts
│   │   │   └── crypto.service.spec.ts
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── token-response.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── refresh-token.schema.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   └── strategies/
│   │   │       └── jwt.strategy.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.service.spec.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── user.schema.ts
│   │   │   └── interfaces/
│   │   │       └── user.interface.ts
│   │   └── settings/
│   │       ├── settings.module.ts
│   │       ├── settings.controller.ts
│   │       ├── settings.service.ts
│   │       ├── settings.service.spec.ts
│   │       ├── settings.repository.ts
│   │       ├── dto/
│   │       │   ├── update-settings.dto.ts
│   │       │   └── complete-setup.dto.ts
│   │       ├── schemas/
│   │       │   └── settings.schema.ts
│   │       └── guards/
│   │           └── setup.guard.ts
│   └── test/
│       ├── jest-e2e.config.ts
│       └── app.e2e-spec.ts
├── frontend/
│   └── .gitkeep
└── worker/
    └── .gitkeep
```

---

### Task 1: Monorepo Scaffolding and Git Setup

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `frontend/.gitkeep`
- Create: `worker/.gitkeep`

- [ ] **Step 1: Create .gitignore**

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/

# Build
dist/
.next/
build/

# Environment
.env
.env.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test
coverage/

# Docker
mongodb_data/
redis_data/
secrets/
```

- [ ] **Step 2: Create .env.example**

```env
# Infrastructure
MONGODB_URI=mongodb://sentinel:sentinel_secret@mongodb:27017/iot-sentinel?authSource=admin
REDIS_URL=redis://redis:6379

# MongoDB root credentials (used by mongo container on first boot)
MONGO_INITDB_ROOT_USERNAME=sentinel
MONGO_INITDB_ROOT_PASSWORD=sentinel_secret

# API
API_PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-me-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 3: Create placeholder directories**

```bash
mkdir -p frontend worker
touch frontend/.gitkeep worker/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore .env.example frontend/.gitkeep worker/.gitkeep
git commit -m "chore: scaffold monorepo root with gitignore and env template"
```

---

### Task 2: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: iot-sentinel-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: iot-sentinel-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: iot-sentinel-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-4000}:4000"
    environment:
      MONGODB_URI: ${MONGODB_URI}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION:-15m}
      JWT_REFRESH_EXPIRATION: ${JWT_REFRESH_EXPIRATION:-7d}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
    volumes:
      - api_secrets:/data/secrets
    depends_on:
      - mongodb
      - redis

volumes:
  mongodb_data:
  redis_data:
  api_secrets:
```

- [ ] **Step 2: Create docker-compose.dev.yml**

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api/src:/app/src
      - api_secrets:/data/secrets
    command: npm run start:dev
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "chore: add Docker Compose for MongoDB, Redis, and API"
```

---

### Task 3: NestJS Project Bootstrap

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/tsconfig.build.json`
- Create: `api/nest-cli.json`
- Create: `api/.eslintrc.js`
- Create: `api/.prettierrc`
- Create: `api/.dockerignore`
- Create: `api/Dockerfile`
- Create: `api/Dockerfile.dev`

- [ ] **Step 1: Initialize NestJS project**

```bash
cd api
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/mongoose @nestjs/swagger @nestjs/bull reflect-metadata rxjs mongoose class-validator class-transformer @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt bull ms ioredis
npm install -D @nestjs/cli @nestjs/testing typescript @types/node @types/express @types/passport-jwt @types/bcrypt @types/ms ts-node ts-jest jest @types/jest eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser mongodb-memory-server
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@common/*": ["src/common/*"],
      "@modules/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 5: Create .eslintrc.js**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

- [ ] **Step 6: Create .prettierrc**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

- [ ] **Step 7: Create .dockerignore**

```
node_modules
dist
coverage
.env
*.log
test-secrets
```

- [ ] **Step 8: Create jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/$1',
  },
};

export default config;
```

- [ ] **Step 9: Create Dockerfile (production)**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN mkdir -p /data/secrets && chmod 700 /data/secrets
EXPOSE 4000
CMD ["node", "dist/main"]
```

- [ ] **Step 10: Create Dockerfile.dev**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p /data/secrets && chmod 700 /data/secrets
EXPOSE 4000
CMD ["npm", "run", "start:dev"]
```

- [ ] **Step 11: Update package.json scripts**

Ensure `api/package.json` has these scripts:
```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.config.ts"
  }
}
```

- [ ] **Step 12: Commit**

```bash
git add api/
git commit -m "chore: bootstrap NestJS project with TypeScript, ESLint, Docker"
```

---

### Task 4: App Entry Point and Common Module

**Files:**
- Create: `api/src/main.ts`
- Create: `api/src/app.module.ts`
- Create: `api/src/common/common.module.ts`
- Create: `api/src/common/dto/pagination-query.dto.ts`
- Create: `api/src/common/dto/paginated-response.dto.ts`
- Create: `api/src/common/filters/http-exception.filter.ts`

- [ ] **Step 1: Create main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('IoT Sentinel API')
    .setDescription('IoT device management and network monitoring')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`IoT Sentinel API running on port ${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
```

- [ ] **Step 2: Create app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Create pagination-query.dto.ts**

```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

- [ ] **Step 4: Create paginated-response.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMeta;

  static create<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
```

- [ ] **Step 5: Create http-exception.filter.ts**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as Record<string, unknown>).message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 6: Create common.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';

@Global()
@Module({})
export class CommonModule {}
```

- [ ] **Step 7: Run lint to verify**

```bash
cd api && npm run lint
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add api/src/main.ts api/src/app.module.ts api/src/common/
git commit -m "feat: add app entry point and common module with pagination, filters"
```

---

### Task 5: Health Check Module

**Files:**
- Create: `api/src/health/health.module.ts`
- Create: `api/src/health/health.controller.ts`

- [ ] **Step 1: Create health.controller.ts**

```typescript
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB + Redis connection)' })
  async ready() {
    const dbState = this.connection.readyState;
    const dbReady = dbState === 1;

    let redisReady = false;
    try {
      const pong = await this.redis.ping();
      redisReady = pong === 'PONG';
    } catch {
      redisReady = false;
    }

    const isReady = dbReady && redisReady;
    return {
      status: isReady ? 'ok' : 'not_ready',
      database: dbReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 2: Create health.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/health/
git commit -m "feat: add health check endpoints (/health, /health/ready)"
```

---

### Task 6: Crypto Service (AES-256-GCM)

**Files:**
- Create: `api/src/crypto/crypto.module.ts`
- Create: `api/src/crypto/crypto.service.ts`
- Create: `api/src/crypto/crypto.service.spec.ts`

- [ ] **Step 1: Write failing test for crypto service**

```typescript
// api/src/crypto/crypto.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';
import * as fs from 'fs';
import * as path from 'path';

describe('CryptoService', () => {
  let service: CryptoService;
  const testKeyDir = path.join(__dirname, '../../test-secrets');
  const testKeyPath = path.join(testKeyDir, 'encryption.key');

  beforeAll(() => {
    if (!fs.existsSync(testKeyDir)) {
      fs.mkdirSync(testKeyDir, { recursive: true });
    }
    process.env.ENCRYPTION_KEY_PATH = testKeyPath;
  });

  afterAll(() => {
    if (fs.existsSync(testKeyPath)) {
      fs.unlinkSync(testKeyPath);
    }
    if (fs.existsSync(testKeyDir)) {
      fs.rmdirSync(testKeyDir);
    }
  });

  beforeEach(async () => {
    // Remove key if exists to test auto-generation
    if (fs.existsSync(testKeyPath)) {
      fs.unlinkSync(testKeyPath);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    await service.onModuleInit();
  });

  it('should auto-generate encryption key on first boot', () => {
    expect(fs.existsSync(testKeyPath)).toBe(true);
    const keyBuffer = fs.readFileSync(testKeyPath);
    expect(keyBuffer.length).toBe(32); // 256 bits
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'my-secret-password';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // iv:authTag:ciphertext format

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-value';
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = service.encrypt('test');
    const tampered = encrypted.slice(0, -2) + 'xx';
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('should encrypt and decrypt with a custom password', () => {
    const plaintext = 'backup-credential';
    const password = 'my-backup-password';
    const encrypted = service.encryptWithPassword(plaintext, password);
    const decrypted = service.decryptWithPassword(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle empty strings', () => {
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && npx jest src/crypto/crypto.service.spec.ts --verbose
```
Expected: FAIL — CryptoService not found

- [ ] **Step 3: Implement crypto.service.ts**

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyPath: string;

  constructor() {
    this.keyPath = process.env.ENCRYPTION_KEY_PATH || '/data/secrets/encryption.key';
  }

  async onModuleInit() {
    await this.loadOrGenerateKey();
  }

  private async loadOrGenerateKey() {
    const keyDir = path.dirname(this.keyPath);

    if (fs.existsSync(this.keyPath)) {
      this.encryptionKey = fs.readFileSync(this.keyPath);
      this.logger.log('Encryption key loaded from disk');
    } else {
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }
      this.encryptionKey = crypto.randomBytes(32);
      fs.writeFileSync(this.keyPath, this.encryptionKey, { mode: 0o600 });
      this.logger.warn('New encryption key generated and saved');
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptWithPassword(plaintext: string, password: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decryptWithPassword(ciphertext: string, password: string): string {
    const [saltHex, ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const key = crypto.scryptSync(password, salt, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

- [ ] **Step 4: Create crypto.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd api && npx jest src/crypto/crypto.service.spec.ts --verbose
```
Expected: 6 tests PASS

- [ ] **Step 6: Add CryptoModule to app.module.ts imports**

Add `CryptoModule` to the imports array in `api/src/app.module.ts`:
```typescript
import { CryptoModule } from './crypto/crypto.module';
// ... add to imports: [... CryptoModule, ...]
```

- [ ] **Step 7: Commit**

```bash
git add api/src/crypto/ api/src/app.module.ts
git commit -m "feat: add crypto service with AES-256-GCM encryption and auto-generated key"
```

---

### Task 7: User Schema and Repository

**Files:**
- Create: `api/src/users/interfaces/user.interface.ts`
- Create: `api/src/users/schemas/user.schema.ts`
- Create: `api/src/users/dto/create-user.dto.ts`
- Create: `api/src/users/dto/update-user.dto.ts`
- Create: `api/src/users/users.repository.ts`

- [ ] **Step 1: Create user.interface.ts**

```typescript
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

export interface IUser extends Document {
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create user.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../interfaces/user.interface';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

- [ ] **Step 3: Create create-user.dto.ts**

```typescript
import { IsString, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../interfaces/user.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, hyphens, and underscores' })
  username: string;

  @ApiProperty({ example: 'strongpassword123' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.VIEWER })
  @IsEnum(UserRole)
  role: UserRole = UserRole.VIEWER;
}
```

- [ ] **Step 4: Create update-user.dto.ts**

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['username'] as const)) {}
```

- [ ] **Step 5: Create users.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    return this.userModel.create(createUserDto);
  }

  async findAll(page: number, limit: number): Promise<{ data: UserDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .select('-password')
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
  }

  async delete(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async count(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add api/src/users/
git commit -m "feat: add user schema, DTOs, and repository layer"
```

---

### Task 8: Users Service and Module (without controller)

**Files:**
- Create: `api/src/users/users.service.ts`
- Create: `api/src/users/users.service.spec.ts`
- Create: `api/src/users/users.module.ts`

- [ ] **Step 1: Write failing test for users service**

```typescript
// api/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from './interfaces/user.interface';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      mockRepository.findByUsername.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        _id: '123',
        username: 'testuser',
        role: UserRole.VIEWER,
      });

      const result = await service.create({
        username: 'testuser',
        password: 'password123',
        role: UserRole.VIEWER,
      });

      expect(result.username).toBe('testuser');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          password: expect.not.stringContaining('password123'),
        }),
      );
    });

    it('should throw ConflictException if username exists', async () => {
      mockRepository.findByUsername.mockResolvedValue({ username: 'existing' });

      await expect(
        service.create({ username: 'existing', password: 'pass123', role: UserRole.VIEWER }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && npx jest src/users/users.service.spec.ts --verbose
```
Expected: FAIL — UsersService not found

- [ ] **Step 3: Implement users.service.ts**

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByUsername(createUserDto.username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, this.BCRYPT_ROUNDS);
    return this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<User>> {
    const { data, total } = await this.usersRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, this.BCRYPT_ROUNDS);
    }
    const user = await this.usersRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.delete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  async validatePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && npx jest src/users/users.service.spec.ts --verbose
```
Expected: 3 tests PASS

- [ ] **Step 5: Create users.module.ts (without controller for now — added in Task 10)**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Add UsersModule to app.module.ts imports**

```typescript
import { UsersModule } from './users/users.module';
// Add to imports array: UsersModule
```

- [ ] **Step 7: Commit**

```bash
git add api/src/users/ api/src/app.module.ts
git commit -m "feat: add users module with service and repository"
```

---

### Task 9: Auth Guards, Decorators, and Schemas

**Files:**
- Create: `api/src/auth/schemas/refresh-token.schema.ts`
- Create: `api/src/auth/dto/login.dto.ts`
- Create: `api/src/auth/dto/token-response.dto.ts`
- Create: `api/src/auth/guards/jwt-auth.guard.ts`
- Create: `api/src/auth/guards/roles.guard.ts`
- Create: `api/src/auth/decorators/current-user.decorator.ts`
- Create: `api/src/auth/decorators/roles.decorator.ts`

- [ ] **Step 1: Create refresh-token.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1 });
```

- [ ] **Step 2: Create login.dto.ts**

```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1)
  password: string;
}
```

- [ ] **Step 3: Create token-response.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: string;
}
```

- [ ] **Step 4: Create jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}
```

- [ ] **Step 5: Create guards and decorators**

`jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`roles.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/interfaces/user.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

`roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/interfaces/user.interface';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

`current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 6: Commit guards and decorators**

```bash
git add api/src/auth/
git commit -m "feat: add auth guards, decorators, schemas, and DTOs"
```

---

### Task 10: Users Controller (depends on auth guards from Task 9)

**Files:**
- Create: `api/src/users/users.controller.ts`
- Modify: `api/src/users/users.module.ts`

- [ ] **Step 1: Create users.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './interfaces/user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
```

- [ ] **Step 2: Update users.module.ts to add controller**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/users/
git commit -m "feat: add users controller with JWT auth and role guards"
```

---

### Task 11: Auth Service, Controller, and Module Wiring

**Files:**
- Create: `api/src/auth/auth.repository.ts`
- Create: `api/src/auth/auth.service.ts`
- Create: `api/src/auth/auth.service.spec.ts`
- Create: `api/src/auth/auth.controller.ts`
- Create: `api/src/auth/auth.module.ts`
- Create: `api/src/auth/strategies/jwt.strategy.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create auth.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      token,
      expiresAt,
    });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenModel.findOne({ token }).exec();
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ token }).exec();
  }

  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
  }
}
```

- [ ] **Step 2: Write failing test for auth service**

```typescript
// api/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/interfaces/user.interface';

const mockUsersService = {
  findByUsername: jest.fn(),
  validatePassword: jest.fn(),
};

const mockAuthRepository = {
  createRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  deleteAllUserTokens: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      mockUsersService.findByUsername.mockResolvedValue({
        _id: '123',
        username: 'admin',
        password: 'hashed',
        role: UserRole.ADMIN,
      });
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockAuthRepository.createRefreshToken.mockResolvedValue({});

      const result = await service.login('admin', 'password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException on invalid username', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(service.login('wrong', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockUsersService.findByUsername.mockResolvedValue({
        _id: '123',
        username: 'admin',
        password: 'hashed',
        role: UserRole.ADMIN,
      });
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(service.login('admin', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd api && npx jest src/auth/auth.service.spec.ts --verbose
```
Expected: FAIL — AuthService not found

- [ ] **Step 4: Implement auth.service.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import ms from 'ms';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<TokenResponseDto> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user._id.toString(), user.username, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const stored = await this.authRepository.findRefreshToken(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.deleteRefreshToken(refreshToken);

    const user = await this.usersService.findById(stored.userId.toString());
    return this.generateTokens(user._id.toString(), user.username, user.role);
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.deleteAllUserTokens(userId);
  }

  private async generateTokens(
    userId: string,
    username: string,
    role: string,
  ): Promise<TokenResponseDto> {
    const payload = { sub: userId, username, role };
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '15m';

    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    await this.authRepository.createRefreshToken(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken, expiresIn };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd api && npx jest src/auth/auth.service.spec.ts --verbose
```
Expected: 3 tests PASS

- [ ] **Step 6: Create auth.controller.ts**

```typescript
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate all refresh tokens)' })
  logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }
}
```

- [ ] **Step 7: Create auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '15m' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 8: Add AuthModule to app.module.ts**

```typescript
import { AuthModule } from './auth/auth.module';
// Add to imports array: AuthModule
```

- [ ] **Step 9: Run all tests**

```bash
cd api && npx jest --verbose
```
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add api/src/auth/ api/src/app.module.ts
git commit -m "feat: add auth service, controller, and module with JWT and refresh tokens"
```

---

### Task 12: Settings Module (Setup Wizard Support)

**Files:**
- Create: `api/src/settings/schemas/settings.schema.ts`
- Create: `api/src/settings/dto/update-settings.dto.ts`
- Create: `api/src/settings/dto/complete-setup.dto.ts`
- Create: `api/src/settings/settings.repository.ts`
- Create: `api/src/settings/settings.service.ts`
- Create: `api/src/settings/settings.service.spec.ts`
- Create: `api/src/settings/settings.controller.ts`
- Create: `api/src/settings/guards/setup.guard.ts`
- Create: `api/src/settings/settings.module.ts`

- [ ] **Step 1: Create settings.schema.ts**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ _id: false })
class BackupSettings {
  @Prop({ default: false })
  autoEnabled: boolean;

  @Prop({ enum: ['daily', 'weekly', 'monthly'], default: 'weekly' })
  frequency: string;

  @Prop()
  password: string;

  @Prop({ default: 5 })
  retention: number;

  @Prop({ enum: ['local', 'google_drive', 's3'], default: 'local' })
  destination: string;
}

@Schema({ _id: false })
class MonitorSettings {
  @Prop({ default: 300 })
  statusCheckInterval: number;
}

@Schema({ _id: false })
class ScannerSettings {
  @Prop({ default: 1 })
  maxConcurrentScans: number;

  @Prop({ default: 60 })
  cooldownSeconds: number;
}

@Schema({ timestamps: true })
export class Settings {
  @Prop({ default: 'IoT Sentinel' })
  instanceName: string;

  @Prop({ default: 'en-US' })
  language: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: false })
  setupCompleted: boolean;

  @Prop({ type: BackupSettings, default: () => ({}) })
  backup: BackupSettings;

  @Prop({ type: MonitorSettings, default: () => ({}) })
  monitor: MonitorSettings;

  @Prop({ type: ScannerSettings, default: () => ({}) })
  scanner: ScannerSettings;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
```

- [ ] **Step 2: Create DTOs**

`update-settings.dto.ts`:
```typescript
import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class BackupSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  retention?: number;
}

class MonitorSettingsDto {
  @ApiPropertyOptional({ description: 'Seconds between ping sweeps', default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  statusCheckInterval?: number;
}

class ScannerSettingsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentScans?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  cooldownSeconds?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instanceName?: string;

  @ApiPropertyOptional({ enum: ['pt-BR', 'en-US'] })
  @IsOptional()
  @IsEnum(['pt-BR', 'en-US'])
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BackupSettingsDto)
  backup?: BackupSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MonitorSettingsDto)
  monitor?: MonitorSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ScannerSettingsDto)
  scanner?: ScannerSettingsDto;
}
```

`complete-setup.dto.ts`:
```typescript
import { IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteSetupDto {
  @ApiProperty({ enum: ['pt-BR', 'en-US'] })
  @IsEnum(['pt-BR', 'en-US'])
  language: string;

  @ApiProperty()
  @IsString()
  instanceName: string;

  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  adminUsername: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  adminPassword: string;
}
```

- [ ] **Step 3: Create settings.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsRepository {
  constructor(@InjectModel(Settings.name) private readonly settingsModel: Model<Settings>) {}

  async get(): Promise<Settings | null> {
    return this.settingsModel.findOne().exec();
  }

  async getOrCreate(): Promise<Settings> {
    let settings = await this.get();
    if (!settings) {
      settings = await this.settingsModel.create({});
    }
    return settings;
  }

  async update(updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    const flatUpdate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateSettingsDto)) {
      if (typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (nestedValue !== undefined) {
            flatUpdate[`${key}.${nestedKey}`] = nestedValue;
          }
        }
      } else if (value !== undefined) {
        flatUpdate[key] = value;
      }
    }
    return this.settingsModel.findOneAndUpdate({}, { $set: flatUpdate }, { new: true }).exec();
  }

  async markSetupComplete(): Promise<Settings> {
    return this.settingsModel
      .findOneAndUpdate({}, { $set: { setupCompleted: true } }, { new: true })
      .exec();
  }
}
```

- [ ] **Step 4: Write failing test for settings service**

```typescript
// api/src/settings/settings.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/interfaces/user.interface';

const mockRepository = {
  get: jest.fn(),
  getOrCreate: jest.fn(),
  update: jest.fn(),
  markSetupComplete: jest.fn(),
};

const mockUsersService = {
  create: jest.fn(),
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SettingsRepository, useValue: mockRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  describe('isSetupComplete', () => {
    it('should return false when no settings exist', async () => {
      mockRepository.get.mockResolvedValue(null);
      expect(await service.isSetupComplete()).toBe(false);
    });

    it('should return true when setup is completed', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: true });
      expect(await service.isSetupComplete()).toBe(true);
    });
  });

  describe('completeSetup', () => {
    it('should throw if setup already completed', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: true });

      await expect(
        service.completeSetup({
          language: 'en-US',
          instanceName: 'Test',
          timezone: 'UTC',
          adminUsername: 'admin',
          adminPassword: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create admin user and complete setup', async () => {
      mockRepository.get.mockResolvedValue({ setupCompleted: false });
      mockRepository.getOrCreate.mockResolvedValue({ setupCompleted: false });
      mockRepository.update.mockResolvedValue({});
      mockRepository.markSetupComplete.mockResolvedValue({ setupCompleted: true });
      mockUsersService.create.mockResolvedValue({ _id: '123', username: 'admin' });

      await service.completeSetup({
        language: 'pt-BR',
        instanceName: 'My IoT',
        timezone: 'America/Sao_Paulo',
        adminUsername: 'admin',
        adminPassword: 'password123',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        role: UserRole.ADMIN,
      });
      expect(mockRepository.markSetupComplete).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd api && npx jest src/settings/settings.service.spec.ts --verbose
```
Expected: FAIL — SettingsService not found

- [ ] **Step 6: Implement settings.service.ts**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { UsersService } from '../users/users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { Settings } from './schemas/settings.schema';
import { UserRole } from '../users/interfaces/user.interface';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly usersService: UsersService,
  ) {}

  async get(): Promise<Settings> {
    return this.settingsRepository.getOrCreate();
  }

  async update(updateSettingsDto: UpdateSettingsDto): Promise<Settings> {
    await this.settingsRepository.getOrCreate();
    return this.settingsRepository.update(updateSettingsDto);
  }

  async isSetupComplete(): Promise<boolean> {
    const settings = await this.settingsRepository.get();
    return settings?.setupCompleted === true;
  }

  async completeSetup(dto: CompleteSetupDto): Promise<Settings> {
    const isComplete = await this.isSetupComplete();
    if (isComplete) {
      throw new BadRequestException('Setup has already been completed');
    }

    await this.settingsRepository.getOrCreate();

    await this.settingsRepository.update({
      language: dto.language,
      instanceName: dto.instanceName,
      timezone: dto.timezone,
    });

    await this.usersService.create({
      username: dto.adminUsername,
      password: dto.adminPassword,
      role: UserRole.ADMIN,
    });

    return this.settingsRepository.markSetupComplete();
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd api && npx jest src/settings/settings.service.spec.ts --verbose
```
Expected: 3 tests PASS

- [ ] **Step 8: Create setup.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class SetupGuard implements CanActivate {
  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.settingsService.isSetupComplete();
  }
}
```

- [ ] **Step 9: Create settings.controller.ts**

```typescript
import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Settings')
@Controller('api/v1')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('setup/status')
  @ApiOperation({ summary: 'Check if initial setup is complete' })
  async getSetupStatus() {
    const isComplete = await this.settingsService.isSetupComplete();
    return { setupCompleted: isComplete };
  }

  @Post('setup/complete')
  @ApiOperation({ summary: 'Complete initial setup wizard' })
  completeSetup(@Body() completeSetupDto: CompleteSetupDto) {
    return this.settingsService.completeSetup(completeSetupDto);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.settingsService.get();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.update(updateSettingsDto);
  }
}
```

- [ ] **Step 10: Create settings.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { Settings, SettingsSchema } from './schemas/settings.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }]),
    UsersModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 11: Add SettingsModule to app.module.ts**

```typescript
import { SettingsModule } from './settings/settings.module';
// Add to imports array: SettingsModule
```

- [ ] **Step 12: Run all tests**

```bash
cd api && npx jest --verbose
```
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add api/src/settings/ api/src/app.module.ts
git commit -m "feat: add settings module with setup wizard and system configuration"
```

---

### Task 13: E2E Test Setup and Smoke Test

**Files:**
- Create: `api/test/jest-e2e.config.ts`
- Create: `api/test/app.e2e-spec.ts`

- [ ] **Step 1: Create jest-e2e.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/../src/common/$1',
    '^@modules/(.*)$': '<rootDir>/../src/$1',
  },
};

export default config;
```

- [ ] **Step 2: Create app.e2e-spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY_PATH = './test-secrets/encryption.key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('Health', () => {
    it('GET /health should return ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('GET /health/ready should check DB and Redis', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.database).toBe('connected');
        });
    });
  });

  describe('Setup', () => {
    it('GET /api/v1/setup/status should return not completed', () => {
      return request(app.getHttpServer())
        .get('/api/v1/setup/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.setupCompleted).toBe(false);
        });
    });

    it('POST /api/v1/setup/complete should create admin and complete setup', () => {
      return request(app.getHttpServer())
        .post('/api/v1/setup/complete')
        .send({
          language: 'pt-BR',
          instanceName: 'Test Instance',
          timezone: 'America/Sao_Paulo',
          adminUsername: 'admin',
          adminPassword: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.setupCompleted).toBe(true);
        });
    });

    it('POST /api/v1/setup/complete should fail on second attempt', () => {
      return request(app.getHttpServer())
        .post('/api/v1/setup/complete')
        .send({
          language: 'en-US',
          instanceName: 'Another',
          timezone: 'UTC',
          adminUsername: 'admin2',
          adminPassword: 'password123',
        })
        .expect(400);
    });
  });

  describe('Auth', () => {
    let accessToken: string;

    it('POST /api/v1/auth/login should return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'password123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      accessToken = res.body.accessToken;
    });

    it('GET /api/v1/users should require auth', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('GET /api/v1/users should work with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
        });
    });
  });
});
```

- [ ] **Step 3: Install supertest**

```bash
cd api && npm install -D supertest @types/supertest
```

- [ ] **Step 4: Run E2E tests**

```bash
cd api && npx jest --config test/jest-e2e.config.ts --verbose
```
Expected: All E2E tests PASS

- [ ] **Step 5: Commit**

```bash
git add api/test/
git commit -m "test: add E2E tests for health, setup wizard, and auth flow"
```

---

### Task 14: Final Verification — Docker Compose Build

- [ ] **Step 1: Copy .env.example to .env**

```bash
cp .env.example .env
```

- [ ] **Step 2: Build API Docker image**

```bash
docker compose build api
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Start all services**

```bash
docker compose up -d
```
Expected: All 3 containers start (api, mongodb, redis)

- [ ] **Step 4: Verify health endpoint**

```bash
curl http://localhost:4000/health
```
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 5: Verify Swagger docs load**

```bash
curl -s http://localhost:4000/api/docs-json | head -c 100
```
Expected: JSON starting with `{"openapi":"3.0.0"...`

- [ ] **Step 6: Run the full setup flow manually**

```bash
# Check setup status
curl http://localhost:4000/api/v1/setup/status

# Complete setup
curl -X POST http://localhost:4000/api/v1/setup/complete \
  -H "Content-Type: application/json" \
  -d '{"language":"pt-BR","instanceName":"IoT Sentinel","timezone":"America/Sao_Paulo","adminUsername":"admin","adminPassword":"admin123"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Expected: Setup completes, login returns JWT tokens

- [ ] **Step 7: Stop containers**

```bash
docker compose down
```

- [ ] **Step 8: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: verify Docker build and full setup flow"
```

---

## Phase Summary

After completing this plan, you will have:
- Monorepo structure with Docker Compose (MongoDB + Redis + API)
- NestJS API with Swagger docs at `/api/docs`
- Common module (pagination, error handling)
- Crypto service (AES-256-GCM with auto-generated key)
- Health check endpoints (`/health`, `/health/ready`)
- User management (CRUD with bcrypt password hashing)
- JWT authentication (access + refresh tokens with revocation)
- Role-based access control (admin, viewer)
- Settings module with setup wizard
- Unit tests (crypto, users, auth, settings) + E2E tests
- Everything runnable via `docker-compose up`

## Next Phase

**Phase 2: Core API** — Locals, Networks, Things, Groups CRUD with full test coverage. See separate plan document.
