import { NextResponse } from 'next/server';
import { db } from './db';
import { getClientIp, isLimited, json, readBearerToken, recordHit, tokensEqual, tooManyRequests } from './security';
import type { UserTokenRole } from '@/lib/types';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_FAIL_LIMIT = 20;

const adminToken = process.env.ADMIN_TOKEN || '';
if (!adminToken) {
  console.warn('[auth] ADMIN_TOKEN is not set; admin API is disabled');
} else if (adminToken.length < 16) {
  console.warn('[auth] ADMIN_TOKEN is shorter than 16 characters; rotate it');
}

export function authenticateAdmin(token: string): { success: boolean; error?: string } {
  if (!adminToken || token.length === 0 || token.length > 256) {
    return { success: false, error: 'invalid_admin_token' };
  }
  if (tokensEqual(token, adminToken)) {
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
  if (!token || token.length > 256) {
    return { success: false, error: 'invalid_user_token' };
  }
  const row = db.prepare('SELECT nickname, role FROM user_tokens WHERE token = ?').get(token) as
    | { nickname: string; role?: string }
    | undefined;

  if (row) {
    const role: UserTokenRole = row.role === 'trusted' ? 'trusted' : 'normal';
    return { success: true, nickname: row.nickname, role };
  }
  return { success: false, error: 'invalid_user_token' };
}

export function requireAdmin(request: Request): { ok: true } | { ok: false; response: NextResponse } {
  const authKey = `authfail:${getClientIp(request)}`;
  if (isLimited(authKey)) return { ok: false, response: tooManyRequests() };
  const token = readBearerToken(request);
  if (!token || !authenticateAdmin(token).success) {
    recordHit(authKey, AUTH_FAIL_LIMIT, AUTH_WINDOW_MS);
    return { ok: false, response: json({ ok: false, error: '认证失败' }, 401) };
  }
  return { ok: true };
}
