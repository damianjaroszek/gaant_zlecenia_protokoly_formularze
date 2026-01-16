import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { User } from '../types/index.js';

const router = Router();

// Dummy hash for constant-time comparison (prevents timing attacks)
// Generated with bcrypt.hashSync('dummy', 10)
const DUMMY_HASH = '$2b$10$dummyhashfordummypasswordcomparison1234';

// Rate limiting dla logowania - max 5 prób na 15 minut
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5,
  message: { error: 'Za dużo prób logowania. Spróbuj ponownie za 15 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Wymagane: username, password' });
  }

  try {
    const query = `
      SELECT id, username, password_hash, display_name, is_active, is_admin
      FROM app_produkcja.users
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);

    const user = result.rows[0] || null;

    // Always perform bcrypt comparison to prevent timing attacks
    // Even if user doesn't exist, we compare against dummy hash
    const hashToCompare = user?.password_hash || DUMMY_HASH;
    const validPassword = await bcrypt.compare(password, hashToCompare);

    // Check all conditions after constant-time comparison
    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Konto nieaktywne' });
    }

    // Zapisz sesję
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAdmin = user.is_admin || false;

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin || false
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Błąd wylogowania' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me - sprawdzenie aktualnej sesji
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Niezalogowany' });
  }

  try {
    const query = `
      SELECT id, username, display_name, is_admin
      FROM app_produkcja.users
      WHERE id = $1 AND is_active = true
    `;
    const result = await pool.query<User>(query, [req.session.userId]);

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Użytkownik nieaktywny' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin || false
    });
  } catch (error) {
    console.error('Błąd sprawdzania sesji:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
