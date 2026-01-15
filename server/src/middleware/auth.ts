import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Wymagane zalogowanie' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Wymagane zalogowanie' });
  }
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Brak uprawnień administratora' });
  }
  next();
}
