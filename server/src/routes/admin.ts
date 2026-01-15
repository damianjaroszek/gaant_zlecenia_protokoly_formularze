import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

const router = Router();

// GET /api/admin/users - lista wszystkich użytkowników
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT id, username, display_name, is_active, is_admin, created_at
      FROM app_produkcja.users
      ORDER BY id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania użytkowników:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/users - tworzenie nowego użytkownika
router.post('/users', async (req, res) => {
  const { username, password, display_name, is_admin } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Wymagane: username, password' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Login musi mieć minimum 3 znaki' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Hasło musi mieć minimum 4 znaki' });
  }

  try {
    // Sprawdź czy użytkownik już istnieje
    const checkResult = await pool.query(
      'SELECT id FROM app_produkcja.users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'Użytkownik o tym loginie już istnieje' });
    }

    // Hashuj hasło
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Dodaj użytkownika
    const insertResult = await pool.query(
      `INSERT INTO app_produkcja.users (username, password_hash, display_name, is_active, is_admin)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id, username, display_name, is_active, is_admin, created_at`,
      [username, passwordHash, display_name || username, is_admin || false]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Błąd tworzenia użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/admin/users/:id - aktualizacja użytkownika (aktywność, admin)
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active, is_admin, display_name } = req.body;

  // Nie pozwól adminowi dezaktywować samego siebie
  if (is_active === false && Number(id) === req.session.userId) {
    return res.status(400).json({ error: 'Nie możesz dezaktywować własnego konta' });
  }

  try {
    const updates: string[] = [];
    const values: (boolean | string | number)[] = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (typeof is_admin === 'boolean') {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(is_admin);
    }
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(display_name);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Brak pól do aktualizacji' });
    }

    values.push(Number(id));
    const query = `
      UPDATE app_produkcja.users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, display_name, is_active, is_admin, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd aktualizacji użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
