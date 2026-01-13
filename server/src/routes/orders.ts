import { Router } from 'express';
import { pool } from '../config/db.js';
import { Order } from '../types/index.js';

const router = Router();

// GET /api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Wymagane parametry: from, to' });
  }

  try {
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
      GROUP BY kp.data, kp.id_zlecenia, kp.zmiana, x.liniapm, mzkz.opis
      ORDER BY kp.data, kp.zmiana, x.liniapm
    `;

    const result = await pool.query<Order>(query, [from, to]);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania zleceń:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/orders/:id - aktualizacja linii produkcyjnej
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { new_line } = req.body;

  console.log('PATCH /orders/:id', { id, new_line, body: req.body });

  if (!new_line) {
    return res.status(400).json({ error: 'Wymagane pole: new_line' });
  }

  const validLines = [1, 2, 3, 33, 4, 44, 5, 7];
  if (!validLines.includes(new_line)) {
    return res.status(400).json({ error: 'Nieprawidłowa linia produkcyjna' });
  }

  try {
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
      console.log('Utworzono nowy rekord w mzk_protokoly_poz dla zlecenia:', id);
    }

    res.json({ success: true, id_zlecenia: id, new_line });
  } catch (error) {
    console.error('Błąd aktualizacji linii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
