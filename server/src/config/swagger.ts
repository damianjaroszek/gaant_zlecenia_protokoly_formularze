import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables
const API_VERSION = process.env.npm_package_version || '1.0.0';
const API_TITLE = process.env.API_TITLE || 'Produkcja API';
const API_DESCRIPTION =
  process.env.API_DESCRIPTION || 'API for production order management';

// Determine file extension based on environment (ts for dev, js for production)
const FILE_EXT = process.env.NODE_ENV === 'production' ? 'js' : 'ts';

// Base error schema to avoid duplication
const baseErrorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string', description: 'Error message' },
  },
} as const;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    // Global security - requires authentication by default
    security: [{ sessionAuth: [] }],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session-based authentication using HTTP-only cookie',
        },
      },
      schemas: {
        // Base error schema - used for inheritance
        Error: {
          ...baseErrorSchema,
          example: { error: 'An error occurred' },
        },
        Error400: {
          allOf: [{ $ref: '#/components/schemas/Error' }],
          example: { error: 'Invalid request parameters' },
        },
        Error401: {
          allOf: [{ $ref: '#/components/schemas/Error' }],
          example: { error: 'Authentication required' },
        },
        Error403: {
          allOf: [{ $ref: '#/components/schemas/Error' }],
          example: { error: 'Access forbidden' },
        },
        Error404: {
          allOf: [{ $ref: '#/components/schemas/Error' }],
          example: { error: 'Resource not found' },
        },
        Error500: {
          allOf: [{ $ref: '#/components/schemas/Error' }],
          example: { error: 'Internal server error' },
        },
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9._-]+$',
              description: 'Username for authentication',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'User password',
            },
          },
          example: {
            username: 'john.doe',
            password: '********',
          },
        },
        // User schemas
        User: {
          type: 'object',
          required: ['id', 'username', 'is_admin'],
          properties: {
            id: { type: 'integer', description: 'Unique user identifier' },
            username: { type: 'string', maxLength: 50 },
            display_name: { type: 'string', maxLength: 100, nullable: true },
            is_admin: { type: 'boolean' },
          },
          example: {
            id: 1,
            username: 'john.doe',
            display_name: 'John Doe',
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
                is_active: { type: 'boolean', description: 'Whether user account is active' },
                created_at: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
              },
            },
          ],
          example: {
            id: 1,
            username: 'john.doe',
            display_name: 'John Doe',
            is_admin: false,
            is_active: true,
            created_at: '2024-01-15T10:30:00Z',
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9._-]+$',
              description: 'Unique username',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'User password (min 8 characters)',
            },
            display_name: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              description: 'Display name for the user',
            },
            is_admin: {
              type: 'boolean',
              default: false,
              description: 'Whether user has admin privileges',
            },
          },
          example: {
            username: 'new.user',
            password: '********',
            display_name: 'New User',
            is_admin: false,
          },
        },
        // Order schemas
        Order: {
          type: 'object',
          required: ['id_zlecenia', 'data_realizacji', 'zmiana', 'opis'],
          properties: {
            id_zlecenia: { type: 'integer', description: 'Unique order identifier' },
            data_realizacji: { type: 'string', format: 'date', description: 'Order execution date' },
            zmiana: { type: 'integer', enum: [1, 2, 3], description: 'Shift number (1-3)' },
            liniapm: { type: 'integer', nullable: true, description: 'Production line number' },
            opis: { type: 'string', maxLength: 500, description: 'Order description' },
          },
          example: {
            id_zlecenia: 1001,
            data_realizacji: '2024-01-15',
            zmiana: 1,
            liniapm: 2,
            opis: 'Component A production batch',
          },
        },
        UpdateLineRequest: {
          type: 'object',
          required: ['id_zlecenia', 'new_line'],
          properties: {
            id_zlecenia: { type: 'integer', description: 'Unique order identifier to update' },
            new_line: { type: 'integer', minimum: 1, description: 'New production line number' },
          },
          example: {
            id_zlecenia: 1001,
            new_line: 3,
          },
        },
        // Production line schemas
        ProductionLine: {
          type: 'object',
          required: ['id', 'line_number', 'is_active'],
          properties: {
            id: { type: 'integer', description: 'Unique production line identifier' },
            line_number: { type: 'integer', minimum: 1, description: 'Production line number' },
            name: { type: 'string', maxLength: 100, nullable: true, description: 'Production line name' },
            is_active: { type: 'boolean', description: 'Whether the line is currently active' },
            display_order: { type: 'integer', nullable: true, description: 'Order for UI display' },
          },
          example: {
            id: 1,
            line_number: 1,
            name: 'Assembly Line A',
            is_active: true,
            display_order: 1,
          },
        },
        ProductionLineBasic: {
          type: 'object',
          required: ['id', 'line_number'],
          properties: {
            id: { type: 'integer', description: 'Unique production line identifier' },
            line_number: { type: 'integer', minimum: 1, description: 'Production line number' },
            name: { type: 'string', maxLength: 100, nullable: true, description: 'Production line name' },
          },
          example: {
            id: 1,
            line_number: 1,
            name: 'Assembly Line A',
          },
        },
        // Response schemas
        SuccessResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: { type: 'boolean', description: 'Indicates operation success' },
          },
          example: { success: true },
        },
        ResetPasswordResponse: {
          type: 'object',
          required: ['success', 'username'],
          properties: {
            success: { type: 'boolean', description: 'Indicates operation success' },
            username: { type: 'string', description: 'Username of the affected account' },
          },
          example: {
            success: true,
            username: 'john.doe',
          },
        },
        // Health check schema
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
    path.join(__dirname, `../routes/*.${FILE_EXT}`),
    path.join(__dirname, `../index.${FILE_EXT}`),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
