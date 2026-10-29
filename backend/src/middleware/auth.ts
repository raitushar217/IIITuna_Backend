import crypto from 'crypto';
import type { RequestHandler } from 'express';
import { AppDataSource, env } from '@/config/db';
import { AuthToken } from '@/entities/User';
import { HttpError } from '@/utils/httpError';

function parseAuthHeader(header: string | undefined): string | null {
  if (!header) return null;
  // DRF token auth uses: "Authorization: Token <key>"
  const tokenMatch = header.match(/^Token\s+(.+)$/i);
  if (tokenMatch) return tokenMatch[1].trim();
  // Also accept Bearer for convenience
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();
  return null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const key = parseAuthHeader(req.header('authorization'));
  if (!key) throw new HttpError(401, 'Authentication credentials were not provided.');

  const tokenRepo = AppDataSource.getRepository(AuthToken);
  const token = await tokenRepo.findOne({
    where: { key },
    relations: { user: true },
  });

  if (!token) throw new HttpError(401, 'Invalid token.');
  if (!token.user.is_active) throw new HttpError(401, 'User inactive or deleted.');

  req.auth = { user: token.user, token };
  next();
};

export function newTokenKey(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function defaultTokenKey(): string {
  return newTokenKey(env.TOKEN_BYTES);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        user: import('@/entities/User').User;
        token: import('@/entities/User').AuthToken;
      };
    }
  }
}

