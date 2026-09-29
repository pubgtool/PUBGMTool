/** URL-safe base64 helpers for packing presets into shareable links. */

export function packToHash(payload: unknown): string {
  const json = JSON.stringify(payload);
  const b64 = window.btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function unpackFromHash<T>(hash: string): T | null {
  if (!hash) return null;
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(escape(window.atob(padded)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function makeShareUrl(prefix: string, payload: unknown): string {
  const base =
    typeof window === 'undefined'
      ? 'https://pubgm-toolkit.local'
      : `${window.location.origin}${window.location.pathname}`;
  return `${base}#${prefix}/${packToHash(payload)}`;
}

export function parseShareHash<T>(prefix: string): T | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash || '';
  const stripped = h.startsWith('#') ? h.slice(1) : h;
  const [k, v] = stripped.split('/');
  if (k !== prefix || !v) return null;
  return unpackFromHash<T>(v);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
