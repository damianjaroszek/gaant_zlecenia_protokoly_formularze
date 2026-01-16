import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import dotenv from 'dotenv';

import { pool } from './config/db.js';
import authRoutes from './routes/auth.js';
import ordersRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

// Walidacja wymaganych zmiennych środowiskowych
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET jest wymagany w zmiennych środowiskowych');
}

const CORS_ORIGIN = process.env.CORS_ORIGIN;
if (!CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN jest wymagany w zmiennych środowiskowych');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Bezpieczne nagłówki HTTP
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Sesje w PostgreSQL
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    schemaName: 'app_produkcja',
    tableName: 'sessions'
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Ochrona przed CSRF
    maxAge: 8 * 60 * 60 * 1000 // 8 godzin (zmiana robocza)
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/orders', requireAuth, ordersRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start serwera
app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
