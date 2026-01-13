import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import dotenv from 'dotenv';

import { pool } from './config/db.js';
import authRoutes from './routes/auth.js';
import ordersRoutes from './routes/orders.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
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
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true dla HTTPS w produkcji
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000 // 8 godzin (zmiana robocza)
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', requireAuth, ordersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start serwera
app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
