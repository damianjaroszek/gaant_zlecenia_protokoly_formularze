import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check:', {
    method: req.method,
    path: req.path,
    sessionId: req.sessionID,
    userId: req.session.userId,
    cookies: req.headers.cookie
  });

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Wymagane zalogowanie' });
  }
  next();
}
