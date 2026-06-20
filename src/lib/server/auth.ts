import { db } from './db';
import type { UserTokenRole } from '@/lib/types';

export function authenticateAdmin(token: string): { success: boolean; error?: string } {
  if (token === process.env.ADMIN_TOKEN) {
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
