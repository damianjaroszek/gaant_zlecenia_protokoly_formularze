import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): ApiError {
    return new ApiError(400, message);
  }

  static unauthorized(message: string = 'Wymagane zalogowanie'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Brak uprawnień'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Nie znaleziono'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static internal(message: string = 'Błąd serwera'): ApiError {
    return new ApiError(500, message, false);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error details
  console.error(`[${req.method}] ${req.path}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Handle PostgreSQL unique constraint violation
  if (isPostgresError(err) && err.code === '23505') {
    res.status(409).json({ error: 'Rekord już istnieje' });
    return;
  }

  // Handle PostgreSQL foreign key violation
  if (isPostgresError(err) && err.code === '23503') {
    res.status(400).json({ error: 'Nieprawidłowe odwołanie do powiązanego rekordu' });
    return;
  }

  // Default error response
  res.status(500).json({ error: 'Błąd serwera' });
}

/**
 * Type guard for PostgreSQL errors
 */
function isPostgresError(err: unknown): err is { code: string } {
  return err !== null && typeof err === 'object' && 'code' in err;
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Nie znaleziono: ${req.method} ${req.path}` });
}
