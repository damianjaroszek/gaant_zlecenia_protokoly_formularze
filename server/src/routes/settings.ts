import { Router } from 'express';
import { productionLineService } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @openapi
 * /settings/lines:
 *   get:
 *     tags: [Settings]
 *     summary: Get production lines available to current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of available production lines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductionLineBasic'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
