import type { RequestHandler } from 'express';
import { HttpError } from '@/utils/httpError';

export const requireTeacher: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new HttpError(401, 'Authentication credentials were not provided.');
  if (req.auth.user.role !== 'teacher') throw new HttpError(403, 'You do not have permission to perform this action.');
  next();
};

export const requireStudent: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new HttpError(401, 'Authentication credentials were not provided.');
  if (req.auth.user.role !== 'student') throw new HttpError(403, 'You do not have permission to perform this action.');
  next();
};

