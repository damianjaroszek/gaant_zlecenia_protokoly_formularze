import { Router } from 'express';
import { userService, productionLineService } from '../services/index.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ==================== UŻYTKOWNICY ====================

// GET /api/admin/users - lista wszystkich użytkowników
router.get('/users', asyncHandler(async (_req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
}));

// POST /api/admin/users - tworzenie nowego użytkownika
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

// PATCH /api/admin/users/:id - aktualizacja użytkownika (aktywność, admin)
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

// POST /api/admin/users/:id/reset-password - resetowanie hasła użytkownika
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

// ==================== LINIE PRODUKCYJNE ====================

// GET /api/admin/lines - pobierz wszystkie linie (do zarządzania)
router.get('/lines', asyncHandler(async (_req, res) => {
  const lines = await productionLineService.getAllLines();
  res.json(lines);
}));

// POST /api/admin/lines - dodaj nową linię
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

// PATCH /api/admin/lines/:id - aktualizuj linię
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

// DELETE /api/admin/lines/:id - usuń linię
router.delete('/lines/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await productionLineService.deleteLine(Number(id));

  if (!deleted) {
    throw ApiError.notFound('Linia nie znaleziona');
  }

  res.json({ success: true });
}));

// ==================== UPRAWNIENIA DO LINII ====================

// GET /api/admin/users/:id/lines - pobierz linie przypisane do użytkownika
router.get('/users/:id/lines', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lines = await userService.getUserLines(Number(id));
  res.json(lines);
}));

// PUT /api/admin/users/:id/lines - ustaw linie dla użytkownika (zastępuje wszystkie)
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
