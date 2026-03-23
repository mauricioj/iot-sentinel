import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY_PATH = './test/test-secrets/encryption.key';
    process.env.REDIS_URL = 'redis://localhost:6379';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('Health', () => {
    it('GET /health should return ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('GET /health/ready should check DB', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.database).toBe('connected');
        });
    });
  });

  describe('Setup', () => {
    it('GET /api/v1/setup/status should return not completed', () => {
      return request(app.getHttpServer())
        .get('/api/v1/setup/status')
        .expect(200)
        .expect((res: Response) => {
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
        .expect((res: Response) => {
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
      accessToken = res.body.accessToken as string;
    });

    it('GET /api/v1/users should require auth', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('GET /api/v1/users should work with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
        });
    });
  });
});
