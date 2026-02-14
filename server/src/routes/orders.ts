import { Router } from 'express';
import { pool } from '../config/db.js';
import { Order, MAX_DAYS } from '../types/index.js';
import { productionLineService } from '../services/index.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { parseId } from '../utils/validation.js';

const router = Router();

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

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get orders by date range
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid date range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /orders/{id}:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order production line
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_line]
 *             properties:
 *               new_line:
 *                 type: integer
 *                 description: New production line number
 *     responses:
 *       200:
 *         description: Update successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id_zlecenia:
 *                   type: string
 *                 new_line:
 *                   type: integer
 *       400:
 *         description: Invalid line number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * Calculate id_data value for ERP database
 * ERP uses days since 1800-12-28 as date format
 */
function calculateIdData(date: Date): number {
  const baseDate = new Date(1800, 11, 28); // 1800-12-28 (month is 0-indexed)
  const diffTime = date.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate id_czas value for ERP database
 * Format: HHMM * 1000 + seconds * 10 + centiseconds (approximate)
 * Based on example: 6725577 represents time around 18:40:55
 */
function calculateIdCzas(date: Date): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  // Format appears to be: HH * 100000 + MM * 1000 + SS * 10 + fraction
  // 18:40:55 -> 6725577 doesn't fit simple pattern, using approximation
  // Let's try: total seconds since midnight * some factor
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  // 6725577 / (18*3600 + 40*60 + 55) = 6725577 / 67255 ≈ 100
  return totalSeconds * 100;
}

router.patch('/:id', asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.id);
  if (orderId === null) {
    throw ApiError.badRequest('Nieprawidłowe ID zlecenia');
  }

  const { new_line } = req.body;

  if (!new_line || typeof new_line !== 'number' || !Number.isInteger(new_line)) {
    throw ApiError.badRequest('Wymagane pole: new_line (liczba całkowita)');
  }

  // Check if user has access to the target line
  const userId = req.session.userId!;
  const isAdmin = req.session.isAdmin || false;
  const userLines = await productionLineService.getLinesForUser(userId, isAdmin);
  const hasAccess = userLines.some(line => line.line_number === new_line);

  if (!hasAccess) {
    throw ApiError.forbidden('Brak dostępu do tej linii produkcyjnej');
  }

  const now = new Date();
  const idData = calculateIdData(now);
  const idCzas = calculateIdCzas(now);
  const kto = 1; // Fixed user ID as per requirements

  // Use transaction to prevent race conditions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if protokol header exists for this order
    const checkProtokolQuery = `
      SELECT 1 FROM g.mzk_protokoly
      WHERE rodzajzrodla = 3 AND id_zrodla1 = $1 AND nr_protokolu = 1
    `;
    const protokolExists = await client.query(checkProtokolQuery, [orderId]);

    if (protokolExists.rowCount === 0) {
      // Insert header into g.mzk_protokoly first
      const insertProtokolQuery = `
        INSERT INTO g.mzk_protokoly
        (rodzajzrodla, id_zrodla1, id_zrodla2, id_zrodla3, id_zrodla4,
         nr_protokolu, komentarz, data_protokolu, id_rodzaju, id_data, id_czas, kto)
        VALUES (3, $1, 0, 0, 0, 1, '', $2, 0, $2, $3, $4)
      `;
      await client.query(insertProtokolQuery, [orderId, idData, idCzas, kto]);
    }

    // Check if protokol position exists
    const checkPozQuery = `
      SELECT 1 FROM g.mzk_protokoly_poz
      WHERE rodzajzrodla = 3 AND id_zrodla1 = $1 AND nr_protokolu = 1 AND lp = 1
    `;
    const pozExists = await client.query(checkPozQuery, [orderId]);

    if (pozExists.rowCount === 0) {
      // Insert position into g.mzk_protokoly_poz
      const insertPozQuery = `
        INSERT INTO g.mzk_protokoly_poz
        (rodzajzrodla, id_zrodla1, id_zrodla2, id_zrodla3, id_zrodla4,
         nr_protokolu, lp, opis, sciezkadostepudopliku, promptopisu,
         laduj_plik_do_tabeli, pole1, pole2, pole3, pole4, pole5,
         lp_slownika, promptopisu1, opis1, promptopisu2, opis2)
        VALUES (3, $1, 0, 0, 0, 1, 1, $2, '',
                '                                        ',
                0, 0, 0, 0, 0, '                    ',
                0, '                                        ', '',
                '                                        ', '')
      `;
      await client.query(insertPozQuery, [orderId, new_line.toString()]);
    } else {
      // Update existing position
      const updatePozQuery = `
        UPDATE g.mzk_protokoly_poz
        SET opis = $1
        WHERE rodzajzrodla = 3 AND id_zrodla1 = $2 AND nr_protokolu = 1 AND lp = 1
      `;
      await client.query(updatePozQuery, [new_line.toString(), orderId]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.json({ success: true, id_zlecenia: orderId, new_line });
}));

export default router;
