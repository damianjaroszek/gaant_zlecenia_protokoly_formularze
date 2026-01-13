import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { User } from '../types/index.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Wymagane: username, password' });
  }

  try {
    const query = `
      SELECT id, username, password_hash, display_name, is_active
      FROM app_produkcja.users
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Konto nieaktywne' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    // Zapisz sesję
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name
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
      SELECT id, username, display_name
      FROM app_produkcja.users
      WHERE id = $1 AND is_active = true
    `;
    const result = await pool.query<User>(query, [req.session.userId]);

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Użytkownik nieaktywny' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd sprawdzania sesji:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
