'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { InfoBundlePanel } from '@/components/dashboard/InfoBundlePanel';
import { EscalationSummaryPanel } from '@/components/dashboard/EscalationSummaryPanel';
import { Button } from '@/components/shared/Button';
import { decodeJwtPayload } from '@/lib/jwt';

type InformationBundle = {
  order?: { order_id: string; status: string; total_amount: number | string } | null;
  order_items?: Array<{ item_id: string; item_name: string; quantity: number }>;
  transaction?: { status: string; amount: number | string; payment_method: string } | null;
  refund_records?: Array<Record<string, unknown>>;
  shipment?: {
    carrier: string;
    tracking_number: string;
    status: string;
    estimated_delivery: string;
  } | null;
  stock_records?: Array<{
    item_id: string;
    quantity_available: number | string;
    warehouse_location: string;
  }>;
};

type EscalationSummary = {
  summary?: string;
  summary_paragraph?: string;
  key_facts?: string[];
  facts?: string[];
  escalation_reason?: string;
  recommended_action?: string;
};

type CaseDetail = {
  reference_number: string;
  information_bundle: InformationBundle | null;
  escalation_summary: EscalationSummary | string | null;
};

export default function EscalationCasePage({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const caseId = params.caseId;
  const [data, setData] = React.useState<CaseDetail | null>(null);

  React.useEffect(() => {
    void api.get<CaseDetail>(`/cases/${caseId}`).then(setData);
  }, [caseId]);

  const joinChat = async () => {
    const token = localStorage.getItem('roar_token');
    const payload = token ? decodeJwtPayload(token) : null;
    if (!payload?.sub) return;

    await api.patch<unknown>(`/cases/${caseId}`, { assigned_to: payload.sub });
    await api.post<unknown>(`/cases/${caseId}/messages`, {
      sender_type: 'agent',
      content: `Agent ${payload.full_name} has joined.`,
    });
    router.push(`/escalation/${caseId}/chat`);
  };

  const referenceNumber = data?.reference_number ?? 'CASE-';

  return (
    <AppShell role="escalation" title={referenceNumber}>
      <div className="mb-4 text-[13px] text-text-secondary">
        <Link href="/escalation" className="hover:underline">
          Dashboard
        </Link>{' '}
        <span className="text-text-muted">&gt;</span> {referenceNumber}
      </div>

      {data ? (
        <div className="flex flex-col gap-6">
          <EscalationSummaryPanel summary={safeParseSummary(data.escalation_summary)} />
          <InfoBundlePanel bundle={data.information_bundle} />
          <div>
            <Button onClick={() => void joinChat()}>Join Chat</Button>
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-text-muted">Loading...</div>
      )}
    </AppShell>
  );
}

function safeParseSummary(value: EscalationSummary | string | null): EscalationSummary | null {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value) as EscalationSummary;
  } catch {
    return null;
  }
}
