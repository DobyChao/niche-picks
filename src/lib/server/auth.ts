import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { db } from './db';
import { clientIp, isAuthBlocked, recordAuthFailure } from './rate-limit';
import type { UserTokenRole } from '@/lib/types';

export { clientIp, isAuthBlocked, recordAuthFailure };

// Prefer the Authorization header. Query-string tokens land in nginx access
// logs and browser history; the query fallback only exists so already-cached
// clients keep working until they pick up the header-based build.
export function extractToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    const value = header.slice(7).trim();
    if (value) return value;
  }
  const queryToken = req.nextUrl.searchParams.get('token');
  return queryToken && queryToken.length > 0 ? queryToken : null;
}

export function authenticateAdmin(token: string): { success: boolean; error?: string } {
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected) {
    return { success: false, error: 'invalid_admin_token' };
  }
  // Hash both sides to a fixed length so timingSafeEqual never leaks length
  // and short-circuit length checks don't leak a match/mismatch early.
  const provided = crypto.createHash('sha256').update(token, 'utf8').digest();
  const wanted = crypto.createHash('sha256').update(expected, 'utf8').digest();
  if (crypto.timingSafeEqual(provided, wanted)) {
    return { success: true };
  }
  return { success: false, error: 'invalid_admin_token' };
}

export function authenticateUser(token: string): {
  success: boolean;
  nickname?: string;
  role?: UserTokenRole;
  error?: string;
} {
  const row = db.prepare('SELECT * FROM user_tokens WHERE token = ?').get(token) as
    | { token: string; nickname: string; role?: string; createdAt: string }
    | undefined;

  if (row) {
    const role: UserTokenRole = row.role === 'trusted' ? 'trusted' : 'normal';
    return { success: true, nickname: row.nickname, role };
  }
  return { success: false, error: 'invalid_user_token' };
}
