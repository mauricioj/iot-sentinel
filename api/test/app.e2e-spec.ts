import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let accessToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY_PATH = './test/test-secrets/encryption.key';
    process.env.REDIS_URL = 'redis://localhost:9079';

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

  describe('Locals CRUD', () => {
    let localId: string;

    it('POST /api/v1/locals should create a local', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/locals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Casa', description: 'Home', address: 'Rua A, 123' })
        .expect(201);
      expect(res.body.name).toBe('Casa');
      localId = res.body._id;
    });

    it('GET /api/v1/locals should list locals', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('GET /api/v1/locals/:id should get by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/locals/${localId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.name).toBe('Casa');
    });

    it('PATCH /api/v1/locals/:id should update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/locals/${localId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Casa Atualizada' })
        .expect(200);
      expect(res.body.name).toBe('Casa Atualizada');
    });
  });

  describe('Networks CRUD', () => {
    let networkId: string;

    it('POST /api/v1/locals/:localId/networks should create', async () => {
      // First get the local
      const locals = await request(app.getHttpServer())
        .get('/api/v1/locals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const localId = locals.body.data[0]._id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/locals/${localId}/networks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'VLAN 10 - IoT', cidr: '192.168.10.0/24', gateway: '192.168.10.1', vlanId: 10 })
        .expect(201);
      expect(res.body.name).toBe('VLAN 10 - IoT');
      networkId = res.body._id;
    });

    it('GET /api/v1/networks should list all networks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/networks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Groups CRUD', () => {
    let groupId: string;

    it('POST /api/v1/groups should create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cameras', icon: 'camera', color: '#22c55e' })
        .expect(201);
      expect(res.body.name).toBe('Cameras');
      groupId = res.body._id;
    });

    it('GET /api/v1/groups should list groups', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Things CRUD', () => {
    let thingId: string;

    it('POST /api/v1/things should create with credentials', async () => {
      // Get networkId and groupId
      const networks = await request(app.getHttpServer())
        .get('/api/v1/networks')
        .set('Authorization', `Bearer ${accessToken}`);
      const networkId = networks.body.data[0]._id;

      const groups = await request(app.getHttpServer())
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${accessToken}`);
      const groupId = groups.body.data[0]._id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/things')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          networkId,
          groupIds: [groupId],
          name: 'Camera Garagem',
          type: 'camera',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          ipAddress: '192.168.10.100',
          credentials: { username: 'admin', password: 'cam123' },
        })
        .expect(201);
      expect(res.body.name).toBe('Camera Garagem');
      thingId = res.body._id;
    });

    it('GET /api/v1/things/:id should return decrypted credentials', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/things/${thingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.credentials.username).toBe('admin');
      expect(res.body.credentials.password).toBe('cam123');
    });

    it('GET /api/v1/things?q=garagem should find by search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/things?q=garagem')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Dashboard', () => {
    it('GET /api/v1/dashboard/stats should return counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.things.total).toBe(1);
      expect(res.body.locals.total).toBe(1);
    });
  });
});
