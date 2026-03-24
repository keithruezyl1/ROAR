export type RoarRole = 'approver' | 'escalation' | 'customer';

export type RoarJwtPayload = {
  sub: string;
  role: RoarRole;
  email: string;
  full_name: string;
  exp?: number;
};

function base64UrlDecode(input: string): string {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(b64);
  return decoded;
}

export function decodeJwtPayload(token: string): RoarJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as RoarJwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: { exp?: number } | null): boolean {
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}
