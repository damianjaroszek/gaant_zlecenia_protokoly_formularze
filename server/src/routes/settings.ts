import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// GET /api/settings/lines - pobierz aktywne linie produkcyjne dostępne dla użytkownika
router.get('/lines', async (req, res) => {
  try {
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    let query: string;
    let params: number[] = [];

    if (isAdmin) {
      // Admin widzi wszystkie aktywne linie
      query = `
        SELECT id, line_number, name, is_active, display_order
        FROM app_produkcja.production_lines
        WHERE is_active = true
        ORDER BY display_order, line_number
      `;
    } else if (userId) {
      // Zwykły użytkownik widzi tylko przypisane linie
      query = `
        SELECT pl.id, pl.line_number, pl.name, pl.is_active, pl.display_order
        FROM app_produkcja.production_lines pl
        INNER JOIN app_produkcja.user_line_access ula ON pl.id = ula.line_id
        WHERE pl.is_active = true AND ula.user_id = $1
        ORDER BY pl.display_order, pl.line_number
      `;
      params = [userId];
    } else {
      // Brak sesji - zwróć pustą listę
      return res.json([]);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania linii produkcyjnych:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
