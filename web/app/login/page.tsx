'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

import { api } from '@/lib/api';
import { decodeJwtPayload } from '@/lib/jwt';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{
        access_token: string;
        token_type: string;
        role: 'approver' | 'escalation' | 'customer';
        user_id: string;
        full_name: string;
      }>('/auth/login', { email, password });

      localStorage.setItem('roar_token', res.access_token);
      Cookies.set('roar_token', res.access_token, { sameSite: 'lax', path: '/' });

      const next = searchParams.get('next');
      if (next) {
        router.push(next);
        return;
      }

      if (res.role === 'customer') {
        router.push('/cases');
      } else if (res.role === 'approver') {
        router.push('/approver');
      } else {
        router.push('/escalation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem('roar_token');
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload) return;
    switch (payload.role) {
        case 'customer':   router.push('/cases'); break;
        case 'approver':   router.push('/approver'); break;
        case 'escalation': router.push('/escalation'); break;
        default: router.push('/login');
      }
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="mx-auto flex min-h-screen max-w-[560px] items-center px-4">
        <div className="w-full rounded-card border border-border-default bg-bg-surface p-6">
          <div className="mb-6">
            <div className="text-[24px] font-bold">ROAR Engine</div>
            <div className="mt-2 text-[13px] text-text-secondary">Sign in to manage your disputes or access the agent portal</div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error ? <div className="text-[13px] text-danger">{error}</div> : null}

            <Button type="submit" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <LoginPageContent />
    </React.Suspense>
  );
}

