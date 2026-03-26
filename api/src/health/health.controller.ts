import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(@InjectConnection() private readonly connection: Connection) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:9079', {
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
