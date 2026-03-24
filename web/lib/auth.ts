import Cookies from 'js-cookie';
import { decodeJwtPayload, isJwtExpired } from './jwt';
import type { RoarRole } from './jwt';

const TOKEN_KEY = 'roar_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  Cookies.set(TOKEN_KEY, token, { sameSite: 'lax', path: '/' });
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  Cookies.remove(TOKEN_KEY, { path: '/' });
}

export function decodeToken() {
  const token = getToken();
  if (!token) return null;
  return decodeJwtPayload(token);
}

export function isTokenExpired(): boolean {
  const payload = decodeToken();
  return isJwtExpired(payload);
}

export function getUserRole(): RoarRole | null {
  const payload = decodeToken();
  if (!payload) return null;
  return payload.role;
}

export function isAgent(): boolean {
  const role = getUserRole();
  return role === 'approver' || role === 'escalation';
}

export function isCustomer(): boolean {
  return getUserRole() === 'customer';
}

export function logout(): void {
  clearToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
