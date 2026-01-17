import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { httpLogger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger: httpLogger,

  genReqId: (req) => {
    return (req.headers['x-request-id'] as string) || randomUUID();
  },

  customProps: (req) => ({
    requestId: req.id,
    userId: (req as unknown as { session?: { userId?: number } }).session?.userId,
  }),

  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  redact: ['req.headers.authorization', 'req.headers.cookie'],

  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
