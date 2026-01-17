import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Produkcja API',
      version: '1.0.0',
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
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            display_name: { type: 'string', nullable: true },
            is_admin: { type: 'boolean' },
          },
        },
        UserWithStatus: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            display_name: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            is_admin: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id_zlecenia: { type: 'integer' },
            data_realizacji: { type: 'string', format: 'date' },
            zmiana: { type: 'integer', enum: [1, 2, 3] },
            liniapm: { type: 'integer', nullable: true },
            opis: { type: 'string' },
          },
        },
        ProductionLine: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            line_number: { type: 'integer' },
            name: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            display_order: { type: 'integer', nullable: true },
          },
        },
        ProductionLineBasic: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            line_number: { type: 'integer' },
            name: { type: 'string', nullable: true },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer', description: 'Uptime in seconds' },
            version: { type: 'string' },
            memory: {
              type: 'object',
              properties: {
                heapUsed: { type: 'integer', description: 'MB' },
                heapTotal: { type: 'integer', description: 'MB' },
                rss: { type: 'integer', description: 'MB' },
                external: { type: 'integer', description: 'MB' },
              },
            },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected'] },
                responseTime: { type: 'integer', description: 'ms' },
                error: { type: 'string' },
              },
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
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
