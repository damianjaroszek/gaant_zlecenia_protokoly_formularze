import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// GET /api/settings/lines - pobierz aktywne linie produkcyjne (publiczny endpoint)
router.get('/lines', async (req, res) => {
  try {
    const query = `
      SELECT id, line_number, name, is_active, display_order
      FROM app_produkcja.production_lines
      WHERE is_active = true
      ORDER BY display_order, line_number
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania linii produkcyjnych:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
