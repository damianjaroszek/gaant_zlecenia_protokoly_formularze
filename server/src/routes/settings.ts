import { Router } from 'express';
import { productionLineService } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/settings/lines - pobierz aktywne linie produkcyjne dostępne dla użytkownika
router.get('/lines', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const isAdmin = req.session.isAdmin || false;

  if (!userId) {
    res.json([]);
    return;
  }

  const lines = await productionLineService.getLinesForUser(userId, isAdmin);
  res.json(lines);
}));

export default router;
