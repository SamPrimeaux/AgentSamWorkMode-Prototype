const STORAGE_KEY = 'workmode.pty_client_id';

export function getOrCreatePtyClientId(): string {
  if (typeof window === 'undefined') return 'workmode-prototype';
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = `wm_${crypto.randomUUID().slice(0, 12)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return 'workmode-prototype';
  }
}
