import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ApiError, asyncHandler, errorHandler } from './errorHandler';

describe('ApiError', () => {
  it('should create error with correct status code and message', () => {
    const error = new ApiError(400, 'Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
    expect(error.isOperational).toBe(true);
  });

  it('should create badRequest error', () => {
    const error = ApiError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('should create unauthorized error with default message', () => {
    const error = ApiError.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Wymagane zalogowanie');
  });

  it('should create unauthorized error with custom message', () => {
    const error = ApiError.unauthorized('Custom message');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Custom message');
  });

  it('should create forbidden error', () => {
    const error = ApiError.forbidden();
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Brak uprawnień');
  });

  it('should create notFound error', () => {
    const error = ApiError.notFound('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('should create conflict error', () => {
    const error = ApiError.conflict('Already exists');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Already exists');
  });

  it('should create internal error with isOperational false', () => {
    const error = ApiError.internal('Server error');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });
});

describe('asyncHandler', () => {
  it('should call the handler function', async () => {
    const mockHandler = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(mockHandler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await wrapped(req, res, next);

    expect(mockHandler).toHaveBeenCalledWith(req, res, next);
  });

  it('should call next with error when handler throws', async () => {
    const error = new Error('Test error');
    const mockHandler = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(mockHandler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('errorHandler', () => {
  const createMockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  };

  const createMockRequest = () => {
    return {
      method: 'GET',
      path: '/test',
    } as Request;
  };

  it('should handle ApiError and return correct status', () => {
    const error = ApiError.badRequest('Invalid input');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input' });
  });

  it('should handle PostgreSQL unique constraint violation', () => {
    const error = { code: '23505', message: 'duplicate key' } as Error & { code: string };
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rekord już istnieje' });
  });

  it('should handle PostgreSQL foreign key violation', () => {
    const error = { code: '23503', message: 'foreign key' } as Error & { code: string };
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 500 for unknown errors', () => {
    const error = new Error('Unknown error');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Błąd serwera' });
  });
});
