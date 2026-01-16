import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { validatePassword } from '../utils/validation.js';

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

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error });
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

// POST /api/admin/users/:id/reset-password - resetowanie hasła użytkownika
router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(400).json({ error: 'Wymagane: new_password' });
  }

  const passwordValidation = validatePassword(new_password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    // Sprawdź czy użytkownik istnieje
    const checkResult = await pool.query(
      'SELECT id, username FROM app_produkcja.users WHERE id = $1',
      [Number(id)]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    // Hashuj nowe hasło
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Zaktualizuj hasło
    await pool.query(
      'UPDATE app_produkcja.users SET password_hash = $1 WHERE id = $2',
      [passwordHash, Number(id)]
    );

    res.json({ success: true, username: checkResult.rows[0].username });
  } catch (error) {
    console.error('Błąd resetowania hasła:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ==================== LINIE PRODUKCYJNE ====================

// GET /api/admin/lines - pobierz wszystkie linie (do zarządzania)
router.get('/lines', async (req, res) => {
  try {
    const query = `
      SELECT id, line_number, name, is_active, display_order, created_at
      FROM app_produkcja.production_lines
      ORDER BY display_order, line_number
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania linii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/lines - dodaj nową linię
router.post('/lines', async (req, res) => {
  const { line_number, name } = req.body;

  if (!line_number || typeof line_number !== 'number') {
    return res.status(400).json({ error: 'Wymagane: line_number (liczba)' });
  }

  if (line_number < 1 || line_number > 999) {
    return res.status(400).json({ error: 'Numer linii musi być między 1 a 999' });
  }

  try {
    // Pobierz najwyższy display_order
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM app_produkcja.production_lines'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    const insertQuery = `
      INSERT INTO app_produkcja.production_lines (line_number, name, is_active, display_order)
      VALUES ($1, $2, true, $3)
      RETURNING id, line_number, name, is_active, display_order, created_at
    `;
    const result = await pool.query(insertQuery, [
      line_number,
      name || `Linia ${line_number}`,
      nextOrder
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'Linia o tym numerze już istnieje' });
    }
    console.error('Błąd dodawania linii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/admin/lines/:id - aktualizuj linię
router.patch('/lines/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active, name, display_order } = req.body;

  try {
    const updates: string[] = [];
    const values: (boolean | string | number)[] = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (typeof display_order === 'number') {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Brak pól do aktualizacji' });
    }

    values.push(Number(id));
    const query = `
      UPDATE app_produkcja.production_lines
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, line_number, name, is_active, display_order, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Linia nie znaleziona' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd aktualizacji linii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/lines/:id - usuń linię
router.delete('/lines/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM app_produkcja.production_lines WHERE id = $1 RETURNING id',
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Linia nie znaleziona' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Błąd usuwania linii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ==================== UPRAWNIENIA DO LINII ====================

// GET /api/admin/users/:id/lines - pobierz linie przypisane do użytkownika
router.get('/users/:id/lines', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT pl.id, pl.line_number, pl.name
      FROM app_produkcja.user_line_access ula
      JOIN app_produkcja.production_lines pl ON ula.line_id = pl.id
      WHERE ula.user_id = $1
      ORDER BY pl.display_order, pl.line_number
    `;
    const result = await pool.query(query, [Number(id)]);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania linii użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/admin/users/:id/lines - ustaw linie dla użytkownika (zastępuje wszystkie)
router.put('/users/:id/lines', async (req, res) => {
  const { id } = req.params;
  const { line_ids } = req.body;

  if (!Array.isArray(line_ids)) {
    return res.status(400).json({ error: 'Wymagane: line_ids (tablica)' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Usuń wszystkie obecne przypisania
    await client.query(
      'DELETE FROM app_produkcja.user_line_access WHERE user_id = $1',
      [Number(id)]
    );

    // Dodaj nowe przypisania
    if (line_ids.length > 0) {
      const values = line_ids.map((_: number, index: number) =>
        `($1, $${index + 2})`
      ).join(', ');

      await client.query(
        `INSERT INTO app_produkcja.user_line_access (user_id, line_id) VALUES ${values}`,
        [Number(id), ...line_ids]
      );
    }

    await client.query('COMMIT');

    // Pobierz zaktualizowaną listę
    const result = await client.query(`
      SELECT pl.id, pl.line_number, pl.name
      FROM app_produkcja.user_line_access ula
      JOIN app_produkcja.production_lines pl ON ula.line_id = pl.id
      WHERE ula.user_id = $1
      ORDER BY pl.display_order, pl.line_number
    `, [Number(id)]);

    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Błąd aktualizacji linii użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  } finally {
    client.release();
  }
});

export default router;
