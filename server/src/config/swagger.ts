import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic version from package.json or fallback
const API_VERSION = process.env.npm_package_version || '1.0.0';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Produkcja API',
      version: API_VERSION,
      description: 'API do zarządzania zleceniami produkcyjnymi',
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Unauthorized access',
          },
        },
        Error400: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Invalid request parameters',
          },
        },
        Error401: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Authentication required',
          },
        },
        Error403: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Access forbidden',
          },
        },
        Error404: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Resource not found',
          },
        },
        Error500: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
          example: {
            error: 'Internal server error',
          },
        },
        User: {
          type: 'object',
          required: ['id', 'username', 'is_admin'],
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            display_name: { type: 'string', nullable: true },
            is_admin: { type: 'boolean' },
          },
          example: {
            id: 1,
            username: 'jan.kowalski',
            display_name: 'Jan Kowalski',
            is_admin: false,
          },
        },
        UserWithStatus: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              required: ['is_active', 'created_at'],
              properties: {
                is_active: { type: 'boolean' },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          ],
          example: {
            id: 1,
            username: 'jan.kowalski',
            display_name: 'Jan Kowalski',
            is_admin: false,
            is_active: true,
            created_at: '2024-01-15T10:30:00Z',
          },
        },
        Order: {
          type: 'object',
          required: ['id_zlecenia', 'data_realizacji', 'zmiana', 'opis'],
          properties: {
            id_zlecenia: { type: 'integer' },
            data_realizacji: { type: 'string', format: 'date' },
            zmiana: { type: 'integer', enum: [1, 2, 3] },
            liniapm: { type: 'integer', nullable: true },
            opis: { type: 'string' },
          },
          example: {
            id_zlecenia: 1001,
            data_realizacji: '2024-01-15',
            zmiana: 1,
            liniapm: 2,
            opis: 'Produkcja komponentow A',
          },
        },
        ProductionLine: {
          type: 'object',
          required: ['id', 'line_number', 'is_active'],
          properties: {
            id: { type: 'integer' },
            line_number: { type: 'integer' },
            name: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            display_order: { type: 'integer', nullable: true },
          },
          example: {
            id: 1,
            line_number: 1,
            name: 'Linia montazowa A',
            is_active: true,
            display_order: 1,
          },
        },
        ProductionLineBasic: {
          type: 'object',
          required: ['id', 'line_number'],
          properties: {
            id: { type: 'integer' },
            line_number: { type: 'integer' },
            name: { type: 'string', nullable: true },
          },
          example: {
            id: 1,
            line_number: 1,
            name: 'Linia montazowa A',
          },
        },
        HealthStatus: {
          type: 'object',
          required: ['status', 'timestamp', 'uptime', 'version', 'database'],
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer', description: 'Uptime in seconds' },
            version: { type: 'string' },
            memory: {
              type: 'object',
              description: 'Memory usage (only in non-production)',
              properties: {
                heapUsed: { type: 'integer', description: 'MB' },
                heapTotal: { type: 'integer', description: 'MB' },
                rss: { type: 'integer', description: 'MB' },
                external: { type: 'integer', description: 'MB' },
              },
            },
            database: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                responseTime: { type: 'integer', description: 'ms' },
                error: { type: 'string' },
              },
            },
          },
          example: {
            status: 'healthy',
            timestamp: '2024-01-15T10:30:00Z',
            uptime: 3600,
            version: '1.0.0',
            database: {
              status: 'connected',
              responseTime: 5,
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Settings', description: 'User settings' },
      { name: 'Admin', description: 'Administration endpoints' },
      { name: 'Health', description: 'Health check' },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../index.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
