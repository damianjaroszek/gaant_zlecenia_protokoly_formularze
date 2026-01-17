import { pool } from '../config/db.js';
import { dbLogger } from '../config/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
    error?: string;
  };
}

class HealthService {
  private readonly DB_TIMEOUT_MS = 5000;
  private readonly version: string;

  constructor() {
    this.version = process.env.npm_package_version || '1.0.0';
  }

  async getHealth(): Promise<HealthStatus> {
    const memory = process.memoryUsage();
    const dbCheck = await this.checkDatabase();

    const overallStatus = dbCheck.status === 'connected' ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: this.version,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
      },
      database: dbCheck,
    };
  }

  private async checkDatabase(): Promise<HealthStatus['database']> {
    const startTime = Date.now();

    try {
      const queryPromise = pool.query('SELECT 1 AS health_check');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), this.DB_TIMEOUT_MS)
      );

      await Promise.race([queryPromise, timeoutPromise]);

      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const err = error as Error;
      dbLogger.warn({ err }, 'Health check database query failed');

      return {
        status: 'disconnected',
        responseTime: Date.now() - startTime,
        error: err.message,
      };
    }
  }
}

export const healthService = new HealthService();
