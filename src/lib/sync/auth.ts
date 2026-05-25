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

export async function validateSyncToken(token: string) {
  const res = await fetch(
    `/api/sync/pull?token=${encodeURIComponent(token)}&since=9999-12-31T23:59:59.999Z`,
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Token 验证失败 (HTTP ${res.status})`);
  }
}
