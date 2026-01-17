import { Router } from 'express';
import { userService, productionLineService } from '../services/index.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ==================== USERS ====================

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserWithStatus'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', asyncHandler(async (_req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
}));

/**
 * @openapi
 * /admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               password:
 *                 type: string
 *               display_name:
 *                 type: string
 *               is_admin:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWithStatus'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users', asyncHandler(async (req, res) => {
  const { username, password, display_name, is_admin } = req.body;

  if (!username || !password) {
    throw ApiError.badRequest('Wymagane: username, password');
  }

  if (username.length < 3) {
    throw ApiError.badRequest('Login musi mieć minimum 3 znaki');
  }

  const user = await userService.createUser({
    username,
    password,
    display_name,
    is_admin
  });

  res.status(201).json(user);
}));

/**
 * @openapi
 * /admin/users/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user status
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *               is_admin:
 *                 type: boolean
 *               display_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWithStatus'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active, is_admin, display_name } = req.body;

  // Nie pozwól adminowi dezaktywować samego siebie
  if (is_active === false && Number(id) === req.session.userId) {
    throw ApiError.badRequest('Nie możesz dezaktywować własnego konta');
  }

  if (is_active === undefined && is_admin === undefined && display_name === undefined) {
    throw ApiError.badRequest('Brak pól do aktualizacji');
  }

  const user = await userService.updateUser(Number(id), { is_active, is_admin, display_name });

  if (!user) {
    throw ApiError.notFound('Użytkownik nie znaleziony');
  }

  res.json(user);
}));

/**
 * @openapi
 * /admin/users/{id}/reset-password:
 *   post:
 *     tags: [Admin]
 *     summary: Reset user password
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_password]
 *             properties:
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 username:
 *                   type: string
 *       400:
 *         description: Missing new_password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users/:id/reset-password', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password) {
    throw ApiError.badRequest('Wymagane: new_password');
  }

  const user = await userService.findById(Number(id));
  if (!user) {
    throw ApiError.notFound('Użytkownik nie znaleziony');
  }

  await userService.resetPassword(Number(id), new_password);

  res.json({ success: true, username: user.username });
}));

// ==================== PRODUCTION LINES ====================

/**
 * @openapi
 * /admin/lines:
 *   get:
 *     tags: [Admin]
 *     summary: Get all production lines
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of all production lines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductionLine'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/lines', asyncHandler(async (_req, res) => {
  const lines = await productionLineService.getAllLines();
  res.json(lines);
}));

/**
 * @openapi
 * /admin/lines:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new production line
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [line_number]
 *             properties:
 *               line_number:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 999
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Production line created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductionLine'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/lines', asyncHandler(async (req, res) => {
  const { line_number, name } = req.body;

  if (!line_number || typeof line_number !== 'number') {
    throw ApiError.badRequest('Wymagane: line_number (liczba)');
  }

  if (line_number < 1 || line_number > 999) {
    throw ApiError.badRequest('Numer linii musi być między 1 a 999');
  }

  const line = await productionLineService.createLine({ line_number, name });
  res.status(201).json(line);
}));

/**
 * @openapi
 * /admin/lines/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update production line
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *               name:
 *                 type: string
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Production line updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductionLine'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Line not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/lines/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active, name, display_order } = req.body;

  if (is_active === undefined && name === undefined && display_order === undefined) {
    throw ApiError.badRequest('Brak pól do aktualizacji');
  }

  const line = await productionLineService.updateLine(Number(id), { is_active, name, display_order });

  if (!line) {
    throw ApiError.notFound('Linia nie znaleziona');
  }

  res.json(line);
}));

/**
 * @openapi
 * /admin/lines/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete production line
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Production line deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Line not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/lines/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await productionLineService.deleteLine(Number(id));

  if (!deleted) {
    throw ApiError.notFound('Linia nie znaleziona');
  }

  res.json({ success: true });
}));

// ==================== USER LINE ACCESS ====================

/**
 * @openapi
 * /admin/users/{id}/lines:
 *   get:
 *     tags: [Admin]
 *     summary: Get lines assigned to user
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of lines assigned to user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductionLineBasic'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:id/lines', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lines = await userService.getUserLines(Number(id));
  res.json(lines);
}));

/**
 * @openapi
 * /admin/users/{id}/lines:
 *   put:
 *     tags: [Admin]
 *     summary: Set lines for user (replaces all)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [line_ids]
 *             properties:
 *               line_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Lines assigned to user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductionLineBasic'
 *       400:
 *         description: Invalid line_ids
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/users/:id/lines', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { line_ids } = req.body;

  if (!Array.isArray(line_ids)) {
    throw ApiError.badRequest('Wymagane: line_ids (tablica)');
  }

  const lines = await userService.setUserLines(Number(id), line_ids);
  res.json(lines);
}));

export default router;
