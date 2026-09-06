export interface SyncIdentity {
  token: string;
  authorName: string;
}

export const SYNC_TOKEN_KEY = 'sync_user_token';
export const SYNC_AUTHOR_KEY = 'sync_author_name';

export function getSavedSyncIdentity(): SyncIdentity {
  if (typeof window === 'undefined') {
    return { token: '', authorName: '' };
  }

  return {
    token: localStorage.getItem(SYNC_TOKEN_KEY) || '',
    authorName: localStorage.getItem(SYNC_AUTHOR_KEY) || '',
  };
}

export function saveSyncIdentity(identity: SyncIdentity) {
  localStorage.setItem(SYNC_TOKEN_KEY, identity.token);
  localStorage.setItem(SYNC_AUTHOR_KEY, identity.authorName);
}

export function clearSyncIdentity() {
  localStorage.removeItem(SYNC_TOKEN_KEY);
  localStorage.removeItem(SYNC_AUTHOR_KEY);
}

// Tokens must not travel in the URL — query strings are recorded in access
// logs and browser history. POST endpoints keep the token in the body.
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function validateSyncToken(token: string) {
  const res = await fetch(
    `/api/sync/pull?since=9999-12-31T23:59:59.999Z`,
    { headers: authHeaders(token) },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Token 验证失败 (HTTP ${res.status})}`);
  }
}
