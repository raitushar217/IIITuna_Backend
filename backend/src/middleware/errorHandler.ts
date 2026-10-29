import type { ErrorRequestHandler } from 'express';
import { HttpError } from '@/utils/httpError';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Unknown error';
  const details = err instanceof HttpError ? err.details : undefined;

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
  });
};

