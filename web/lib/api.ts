const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('roar_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};


import type { CustomerOrder, CasesListResponse, OrderDetails } from '@/types';

export const customerApi = {
  getMyOrders: () => api.get<{ orders: CustomerOrder[] }>('/customers/me/orders'),
  getMyCases: () => api.get<CasesListResponse>('/customers/me/cases'),
  getOrderDetails: (caseId: string) => api.get<OrderDetails>(`/cases/${caseId}/order-details`),
};
