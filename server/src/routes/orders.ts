import { Router } from 'express';
import { pool } from '../config/db.js';
import { Order } from '../types/index.js';
import { productionLineService } from '../services/index.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// UWAGA: Ta sama wartość musi być w client/src/components/DateRangePicker.tsx
const MAX_DAYS = 62;

/**
 * Validate date range parameters
 */
function validateDateRange(from: string, to: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    throw ApiError.badRequest('Nieprawidłowy format daty. Wymagany: YYYY-MM-DD');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw ApiError.badRequest('Nieprawidłowa data');
  }

  if (fromDate > toDate) {
    throw ApiError.badRequest('Data początkowa musi być wcześniejsza niż końcowa');
  }

  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_DAYS) {
    throw ApiError.badRequest(`Maksymalny zakres to ${MAX_DAYS} dni`);
  }
}

// GET /api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    throw ApiError.badRequest('Wymagane parametry: from, to');
  }

  validateDateRange(from as string, to as string);

  const activeLines = await productionLineService.getActiveLineNumbers();

  if (activeLines.length === 0) {
    res.json([]);
    return;
  }

  const query = `
    SELECT
      g.datasql(kp.data) as data_realizacji,
      kp.id_zlecenia,
      kp.zmiana,
      x.liniapm,
      mzkz.opis
    FROM es.ter_karty_pracy kp
    LEFT JOIN g.mzk_zlecenia mzkz ON kp.id_zlecenia = mzkz.id
    LEFT JOIN (
      SELECT
        CASE
          WHEN COALESCE(linianew.opis, '0') > '0' THEN CAST(linianew.opis AS INTEGER)
          ELSE CAST(makr.wartosc AS INTEGER)
        END as liniapm,
        z.id
      FROM g.mzk_zlecenia z
      LEFT JOIN g.mzk_zlecenia_makra makr
        ON makr.id_zlecenia = z.id AND makr.makro = 'MPW'
      LEFT JOIN g.mzk_protokoly_poz linianew
        ON linianew.id_zrodla1 = z.id AND linianew.rodzajzrodla = 3
    ) x ON x.id = kp.id_zlecenia
    WHERE kp.data BETWEEN g.sqldata($1) AND g.sqldata($2)
      AND x.liniapm = ANY($3::int[])
    GROUP BY kp.data, kp.id_zlecenia, kp.zmiana, x.liniapm, mzkz.opis
    ORDER BY kp.data, kp.zmiana, x.liniapm
  `;

  const result = await pool.query<Order>(query, [from, to, activeLines]);
  res.json(result.rows);
}));

// PATCH /api/orders/:id - aktualizacja linii produkcyjnej
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { new_line } = req.body;

  if (!new_line) {
    throw ApiError.badRequest('Wymagane pole: new_line');
  }

  const isValid = await productionLineService.isValidLine(new_line);
  if (!isValid) {
    throw ApiError.badRequest('Nieprawidłowa linia produkcyjna');
  }

  // Najpierw próba UPDATE
  const updateQuery = `
    UPDATE g.mzk_protokoly_poz
    SET opis = $1
    WHERE id_zrodla1 = $2 AND rodzajzrodla = 3
  `;

  const updateResult = await pool.query(updateQuery, [new_line.toString(), id]);

  if (updateResult.rowCount === 0) {
    // Rekord nie istnieje - INSERT z wymaganymi polami
    const insertQuery = `
      INSERT INTO g.mzk_protokoly_poz
      (rodzajzrodla, id_zrodla1, id_zrodla2, id_zrodla3, id_zrodla4, nr_protokolu, lp, opis)
      VALUES (3, $1, 0, 0, 0, 1, 1, $2)
    `;
    await pool.query(insertQuery, [id, new_line.toString()]);
  }

  res.json({ success: true, id_zlecenia: id, new_line });
}));

export default router;
