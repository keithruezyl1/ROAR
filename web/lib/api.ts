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
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    request<T>(path, {
      method: 'POST',
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};


import type { CaseProofUpload, CustomerOrder, CasesListResponse, OrderDetails } from '@/types';

export const customerApi = {
  getMyOrders: () => api.get<{ orders: CustomerOrder[] }>('/customers/me/orders'),
  getMyCases: () => api.get<CasesListResponse>('/customers/me/cases'),
  getOrderDetails: (caseId: string) => api.get<OrderDetails>(`/cases/${caseId}/order-details`),
  uploadProofs: (caseId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return api.post<{ uploads: unknown[]; case_status: string }>(`/cases/${caseId}/proof-uploads`, form);
  },
  listProofs: (caseId: string) => api.get<{ uploads: CaseProofUpload[] }>(`/cases/${caseId}/proof-uploads`),
  getProofUrl: (caseId: string, proofId: string) => `${API_BASE}/cases/${caseId}/proof-uploads/${proofId}`,
  deleteProof: (caseId: string, proofId: string) => api.delete<void>(`/cases/${caseId}/proof-uploads/${proofId}`),
  appealCase: (caseId: string) => api.post(`/cases/${caseId}/appeal`),
};
