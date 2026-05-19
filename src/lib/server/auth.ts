import { db } from './db';

export function authenticateAdmin(token: string): { success: boolean; error?: string } {
  if (token === process.env.ADMIN_TOKEN) {
    return { success: true };
  }
  return { success: false, error: 'invalid_admin_token' };
}

export function authenticateUser(token: string): { success: boolean; nickname?: string; error?: string } {
  const row = db.prepare('SELECT * FROM user_tokens WHERE token = ?').get(token) as
    | { token: string; nickname: string; createdAt: string }
    | undefined;

  if (row) {
    return { success: true, nickname: row.nickname };
  }
  return { success: false, error: 'invalid_user_token' };
}
